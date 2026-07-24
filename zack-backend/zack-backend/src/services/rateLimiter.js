import { supabase } from '../db/supabaseClient.js';
import { config } from '../config.js';

async function getCaps(userId) {
  const { data } = await supabase
    .from('user_settings')
    .select('daily_caps')
    .eq('user_id', userId)
    .single();
  return data?.daily_caps || config.defaultCaps;
}

/** Returns { allowed, remaining, cap } for one action type, rolling 24h window. */
export async function checkCap(userId, actionType) {
  const caps = await getCaps(userId);
  const cap = caps[actionType] ?? Infinity;

  const windowStart = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  const { data: rows } = await supabase
    .from('daily_action_counts')
    .select('count')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .gte('window_start', windowStart);

  const used = (rows || []).reduce((sum, r) => sum + r.count, 0);
  return { allowed: used < cap, remaining: Math.max(0, cap - used), used, cap };
}

/** Call after an action actually executes successfully. */
export async function recordAction(userId, actionType) {
  await supabase.from('daily_action_counts').insert({
    user_id: userId,
    action_type: actionType,
    count: 1,
    window_start: new Date().toISOString(),
  });
}
