import { supabase } from '../db/supabaseClient.js';
import { checkCap } from '../services/rateLimiter.js';
import { sendDailyReport } from '../services/telegram.js';

/** Flags connection requests past their tier's expiry window for manual review (never auto-withdraws). */
export async function reviewExpiredConnections(userId) {
  const { data: pending } = await supabase
    .from('tracked_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'connection_sent')
    .lte('connection_expires_at', new Date().toISOString());

  const reviewList = (pending || []).map((p) => ({
    name: p.full_name || p.profile_url,
    profileUrl: p.profile_url,
    daysWaiting: Math.round((Date.now() - new Date(p.connection_sent_at).getTime()) / 86_400_000),
  }));

  // Soft-flag only - never hard-delete or auto-withdraw. You decide from the report.
  if (pending?.length) {
    await supabase
      .from('tracked_profiles')
      .update({ status: 'connection_expired', updated_at: new Date().toISOString() })
      .in('id', pending.map((p) => p.id));
  }

  return reviewList;
}

export async function runDailyReportForUser(userId) {
  const reviewList = await reviewExpiredConnections(userId);

  const today = new Date().toISOString().slice(0, 10);
  const { data: todaysActions } = await supabase
    .from('daily_action_counts')
    .select('action_type, count')
    .eq('user_id', userId)
    .gte('window_start', `${today}T00:00:00Z`);

  const counts = {};
  for (const row of todaysActions || []) {
    counts[row.action_type] = (counts[row.action_type] || 0) + row.count;
  }

  const [commentCap, connectCap, dmCap] = await Promise.all([
    checkCap(userId, 'comment'),
    checkCap(userId, 'connect'),
    checkCap(userId, 'dm'),
  ]);

  const { count: prospectsAdded } = await supabase
    .from('tracked_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00Z`);

  const { data: session } = await supabase
    .from('linkedin_sessions')
    .select('status, consecutive_failures')
    .eq('user_id', userId)
    .single();

  const pauses = [];
  if (session?.status === 'expired') pauses.push('Session expired - needs fresh cookies.');
  if (session?.status === 'checkpoint') pauses.push('LinkedIn checkpoint hit - needs manual re-verify.');

  await sendDailyReport({
    counts,
    prospectsAdded: prospectsAdded || 0,
    pauses,
    capsRemaining: { comment: commentCap.remaining, connect: connectCap.remaining, dm: dmCap.remaining },
    reviewList,
  });
}
