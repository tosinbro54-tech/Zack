import { supabase } from '../db/supabaseClient.js';
import { getDecryptedSession, recordSessionFailure } from '../services/sessionVault.js';
import { checkCap, recordAction } from '../services/rateLimiter.js';
import { withSession } from '../services/playwrightSession.js';
import { commentOnPost, sendConnectionRequest, sendDirectMessage, sendReplyInThread } from '../services/linkedinActions.js';
import { markPostSeen } from '../services/dedup.js';
import { commentsRequiredForTier, expiryDaysForTier } from '../services/warmup.js';
import { sendAlert } from '../services/telegram.js';
import { config } from '../config.js';

let lastActionAt = 0;

async function respectMinGap() {
  const elapsed = Date.now() - lastActionAt;
  if (elapsed < config.minGapMs) {
    await new Promise((r) => setTimeout(r, config.minGapMs - elapsed));
  }
  lastActionAt = Date.now();
}

/**
 * Called by the cron-triggered endpoint. Processes all users with an active
 * session and due, approved queue items - one browser session per user per
 * invocation (fine at personal scale; revisit if this ever needs to scale
 * to many users).
 */
export async function runDueActionsForAllUsers() {
  const { data: sessions } = await supabase
    .from('linkedin_sessions')
    .select('user_id, status')
    .in('status', ['active']);

  for (const s of sessions || []) {
    await runDueActionsForUser(s.user_id);
  }
}

export async function runDueActionsForUser(userId) {
  const session = await getDecryptedSession(userId);
  if (!session || session.status !== 'active') return;

  const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();

  const { data: dueItems } = await supabase
    .from('action_queue')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['scheduled', 'approved'])
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(10); // process a bounded batch per cron tick, not the whole backlog

  if (!dueItems?.length) return;

  await withSession(session, async (page) => {
    for (const item of dueItems) {
      // Approval gate: comments/connects respect their auto-approve toggle,
      // DMs default to requiring approval per the earlier decision.
      const autoApproveMap = {
        comment: settings?.auto_approve_comments ?? true,
        connect: settings?.auto_approve_connects ?? true,
        dm: settings?.auto_approve_dms ?? false,
        reply: settings?.auto_approve_dms ?? false,
      };
      if (item.requires_approval && item.status !== 'approved' && !autoApproveMap[item.action_type]) {
        continue; // stays queued, waits for manual approval
      }

      const capKey = item.action_type === 'reply' ? 'dm' : item.action_type;
      const cap = await checkCap(userId, capKey);
      if (!cap.allowed) continue; // skip, will be picked up tomorrow's window

      await respectMinGap();

      let result;
      try {
        if (item.action_type === 'comment') {
          result = await commentOnPost(page, { postUrl: item.payload.postUrl, commentText: item.payload.text });
        } else if (item.action_type === 'connect') {
          result = await sendConnectionRequest(page, {
            profileUrl: item.payload.profileUrl,
            note: item.payload.note,
          });
        } else if (item.action_type === 'dm') {
          result = await sendDirectMessage(page, {
            profileUrl: item.payload.profileUrl,
            messageText: item.payload.text,
          });
        } else if (item.action_type === 'reply') {
          result = await sendReplyInThread(page, {
            conversationUrl: item.payload.conversationUrl,
            text: item.payload.text,
          });
        } else {
          continue; // 'post' and 'scan' handled by separate jobs
        }
      } catch (err) {
        result = { success: false, error: String(err) };
      }

      if (result?.success) {
        await supabase
          .from('action_queue')
          .update({ status: 'done', executed_at: new Date().toISOString() })
          .eq('id', item.id);
        await recordAction(userId, capKey);

        if (item.action_type === 'comment' && item.post_urn) {
          await markPostSeen(userId, item.post_urn, { trackedProfileId: item.tracked_profile_id, commented: true });
          if (item.tracked_profile_id) await bumpCommentProgress(userId, item.tracked_profile_id);
        }
        if (item.action_type === 'connect' && item.tracked_profile_id) {
          await markConnectionSent(userId, item.tracked_profile_id);
        }
      } else {
        await supabase
          .from('action_queue')
          .update({
            status: 'failed',
            attempts: item.attempts + 1,
            last_error: result?.error || 'unknown failure',
          })
          .eq('id', item.id);

        const { hardPause } = await recordSessionFailure(session.id, { checkpointDetected: !!result?.checkpoint });
        if (hardPause) {
          await sendAlert(
            result?.checkpoint
              ? 'LinkedIn showed a checkpoint/CAPTCHA. All automation paused - please re-verify your session.'
              : 'Two consecutive action failures. Automation paused - check session health.'
          );
          return; // stop processing this user's remaining items this tick
        }
      }
    }
  });
}

async function bumpCommentProgress(userId, trackedProfileId) {
  const { data: profile } = await supabase
    .from('tracked_profiles')
    .select('*')
    .eq('id', trackedProfileId)
    .single();
  if (!profile) return;

  const commentsLanded = (profile.comments_landed || 0) + 1;
  const required = profile.comments_required || commentsRequiredForTier(profile.frequency_tier);

  const update = { comments_landed: commentsLanded, status: 'warming', updated_at: new Date().toISOString() };

  if (commentsLanded >= required && profile.kind === 'icp_prospect') {
    // Warm-up complete -> queue a connection request (handled by the queue
    // builder, not executed inline here to keep pacing/jitter consistent).
    update.status = 'ready_to_connect';
  }

  await supabase.from('tracked_profiles').update(update).eq('id', trackedProfileId);
}

async function markConnectionSent(userId, trackedProfileId) {
  const { data: profile } = await supabase
    .from('tracked_profiles')
    .select('frequency_tier')
    .eq('id', trackedProfileId)
    .single();

  const expiryDays = expiryDaysForTier(profile?.frequency_tier);
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60_000).toISOString();

  await supabase
    .from('tracked_profiles')
    .update({
      status: 'connection_sent',
      connection_sent_at: new Date().toISOString(),
      connection_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trackedProfileId);
}
