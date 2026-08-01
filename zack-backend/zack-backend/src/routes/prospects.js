import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';
import { isProfileTracked } from '../services/dedup.js';
import { discoverNewPostsForUser } from '../services/discovery.js';
import { withSession } from '../services/playwrightSession.js';
import { getDecryptedSession } from '../services/sessionVault.js';
import { mineComments, scanProfileForScoring } from '../services/linkedinActions.js';
import { passesPreFilter } from '../services/icpScoring.js';
import { sendTelegramMessage } from '../services/telegram.js';
import { config } from '../config.js';

export const prospectsRouter = Router();

prospectsRouter.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('tracked_profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Manual add (creator or ICP prospect)
prospectsRouter.post('/', async (req, res) => {
  const { profileUrl, kind, fullName, headline, icpProfileId } = req.body;
  if (!profileUrl || !kind) return res.status(400).json({ error: 'profileUrl and kind are required' });

  const existing = await isProfileTracked(req.user.id, profileUrl);
  if (existing) return res.status(409).json({ error: 'already tracked', existing });

  const { data, error } = await supabase
    .from('tracked_profiles')
    .insert({
      user_id: req.user.id,
      profile_url: profileUrl,
      kind,
      full_name: fullName,
      headline,
      icp_profile_id: icpProfileId || null,
      source: 'manual',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

prospectsRouter.patch('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('tracked_profiles')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

prospectsRouter.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('tracked_profiles').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Returns posts already discovered by the background scan - instant, no live scraping.
prospectsRouter.get('/discover-posts', async (req, res) => {
  const { data, error } = await supabase
    .from('discovered_posts')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('status', 'pending')
    .order('discovered_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Moves a discovered post's drafted comment into the real action queue (jittered, respects caps/approval).
prospectsRouter.post('/discover-posts/:id/queue-comment', async (req, res) => {
  const { data: post, error } = await supabase
    .from('discovered_posts')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();
  if (error || !post) return res.status(404).json({ error: 'not found' });

  const scheduledAt = new Date(Date.now() + (5 + Math.random() * 55) * 60_000).toISOString(); // 5-60 min out

  await supabase.from('action_queue').insert({
    user_id: req.user.id,
    action_type: 'comment',
    tracked_profile_id: post.tracked_profile_id,
    post_urn: post.post_urn,
    payload: { postUrl: post.post_url, text: post.drafted_comment },
    requires_approval: true,
    status: 'scheduled',
    scheduled_at: scheduledAt,
  });

  await supabase.from('discovered_posts').update({ status: 'queued' }).eq('id', post.id);
  res.json({ ok: true });
});

// Real auto-drafted comments waiting for review - powers the Comment agent's live feed.
prospectsRouter.get('/live-comment-drafts', async (req, res) => {
  const { data: fromDiscovery } = await supabase
    .from('discovered_posts')
    .select('id, post_text, author_name, drafted_comment, discovered_at, tracked_profile_id')
    .eq('user_id', req.user.id)
    .eq('status', 'pending')
    .not('drafted_comment', 'is', null)
    .order('discovered_at', { ascending: false })
    .limit(20);

  res.json(fromDiscovery || []);
});

// On-demand: live-mine ONE post's comment section right now, return pre-filtered candidates for review.
// Synchronous since it's a single page load, not a full scan - fine within Render's request timeout.
prospectsRouter.post('/mine-comments', async (req, res) => {
  const { postUrl } = req.body;
  if (!postUrl) return res.status(400).json({ error: 'postUrl is required' });

  const session = await getDecryptedSession(req.user.id);
  if (!session || session.status !== 'active') return res.status(400).json({ error: 'no active LinkedIn session' });

  try {
    const candidates = await withSession(session, async (page) => {
      const result = await mineComments(page, { postUrl });
      if (!result.success) return [];
      return result.comments.filter((c) =>
        passesPreFilter({ commentText: c.text, headline: null, icpCriteria: null })
      );
    });
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});


// TEMPORARY test route - verifies the headline/about scanner against a real
// profile without wiring it into the full automated scoring pipeline yet.
// Call it once with a real profileUrl, check the response (and your
// Telegram if DEBUG_PROFILE_SCAN is on) to confirm headline/about look
// right, then this can be removed or left as a manual debug tool.
prospectsRouter.post('/scan-profile', async (req, res) => {
  const { profileUrl } = req.body;
  if (!profileUrl) return res.status(400).json({ error: 'profileUrl is required' });

  const session = await getDecryptedSession(req.user.id);
  if (!session || session.status !== 'active') return res.status(400).json({ error: 'no active LinkedIn session' });

  try {
    const result = await withSession(session, (page) => scanProfileForScoring(page, { profileUrl }));

    if (config.debugProfileScan) {
      await sendTelegramMessage(
        `*Profile scan test*\n${profileUrl}\n\n*Headline:* ${result.headline || '(empty)'}\n\n*About:* ${(result.about || '(empty)').slice(0, 300)}`
      ).catch(() => {});
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});