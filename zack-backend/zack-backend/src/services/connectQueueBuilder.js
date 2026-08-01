import { supabase } from '../db/supabaseClient.js';
import { draftConnectionNote } from './gemini.js';

/**
 * Finds ONE tracked_profile per call that finished warm-up
 * (status = 'ready_to_connect') and doesn't already have a pending connect
 * action, drafts a connection note, and queues a 'connect' action_queue row.
 * One profile per tick, same pacing philosophy as discovery.js.
 */
export async function buildConnectQueueForUser(userId) {
  const { data: profile } = await supabase
    .from('tracked_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'ready_to_connect')
    .order('updated_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!profile) return { queued: 0 };

  const { data: existing } = await supabase
    .from('action_queue')
    .select('id')
    .eq('user_id', userId)
    .eq('tracked_profile_id', profile.id)
    .eq('action_type', 'connect')
    .in('status', ['queued', 'scheduled', 'approved'])
    .maybeSingle();

  if (existing) return { queued: 0 }; // already queued, don't duplicate

  const note = await draftConnectionNote({
    userId,
    profileHeadline: profile.headline || '',
    context: 'warmed up via comments on their content',
  }).catch(() => null);

  const { data: settings } = await supabase
    .from('user_settings')
    .select('auto_approve_connects')
    .eq('user_id', userId)
    .maybeSingle();
  const autoApprove = settings?.auto_approve_connects ?? true;

  const scheduledAt = new Date(Date.now() + (2 + Math.random() * 8) * 60_000).toISOString(); // 2-10 min out

  await supabase.from('action_queue').insert({
    user_id: userId,
    action_type: 'connect',
    tracked_profile_id: profile.id,
    payload: { profileUrl: profile.profile_url, note },
    requires_approval: !autoApprove,
    status: autoApprove ? 'scheduled' : 'queued',
    scheduled_at: scheduledAt,
  });

  return { queued: 1 };
}
