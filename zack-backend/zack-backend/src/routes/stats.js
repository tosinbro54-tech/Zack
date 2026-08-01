import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';
import { checkCap } from '../services/rateLimiter.js';

export const statsRouter = Router();

statsRouter.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000);

    const { data: counts } = await supabase
      .from('daily_action_counts')
      .select('action_type, count, window_start')
      .eq('user_id', userId)
      .gte('window_start', sevenDaysAgo.toISOString());

    const funnel = { comments: 0, connects: 0, dms: 0 };
    const byDay = {};

    for (const row of counts || []) {
      if (row.action_type === 'comment') funnel.comments += row.count;
      if (row.action_type === 'connect') funnel.connects += row.count;
      if (row.action_type === 'dm') funnel.dms += row.count;

      const day = row.window_start.slice(0, 10);
      byDay[day] = (byDay[day] || 0) + row.count;
    }

    const { count: replies } = await supabase
      .from('tracked_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'replied')
      .gte('updated_at', sevenDaysAgo.toISOString());

    const bars = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60_000);
      const key = d.toISOString().slice(0, 10);
      bars.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), value: byDay[key] || 0 });
    }

    const { data: recentActivityRaw } = await supabase
      .from('action_queue')
      .select('action_type, status, executed_at, created_at, payload, tracked_profiles(full_name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(4);

    const recentActivity = (recentActivityRaw || []).map((a) => ({
      type: a.action_type,
      target: a.tracked_profiles?.full_name || a.payload?.targetLabel || a.payload?.postUrl || 'Unknown',
      status: a.status,
      time: a.executed_at || a.created_at,
    }));

    res.json({
      funnel: { comments: funnel.comments, connects: funnel.connects, dms: funnel.dms, replies: replies || 0 },
      bars,
      recentActivity,
    });
  } catch (err) {
    console.error('[stats/dashboard]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

statsRouter.get('/health', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: session } = await supabase
      .from('linkedin_sessions')
      .select('status, last_verified_at, consecutive_failures')
      .eq('user_id', userId)
      .maybeSingle();

    const [comments, connects, dms] = await Promise.all([
      checkCap(userId, 'comment'),
      checkCap(userId, 'connect'),
      checkCap(userId, 'dm'),
    ]);

    const totalUsed = comments.used + connects.used + dms.used;
    const totalCap = comments.cap + connects.cap + dms.cap;

    const { data: settingsRow } = await supabase
      .from('user_settings')
      .select('auto_approve_comments, auto_approve_connects, auto_approve_dms')
      .eq('user_id', userId)
      .maybeSingle();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
    const { count: warnings } = await supabase
      .from('action_queue')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'failed')
      .gte('created_at', sevenDaysAgo);

    let risk = 'Low';
    if (session?.status === 'checkpoint') risk = 'High';
    else if ((session?.consecutive_failures || 0) > 0 || (warnings || 0) > 2) risk = 'Medium';

    res.json({
      session: {
        status: session?.status || 'unverified',
        lastVerifiedAt: session?.last_verified_at || null,
        consecutiveFailures: session?.consecutive_failures || 0,
      },
      gauges: {
        comments: { used: comments.used, cap: comments.cap },
        connects: { used: connects.used, cap: comments.cap },
        dms: { used: dms.used, cap: dms.cap },
        total: { used: totalUsed, cap: totalCap },
      },
      warnings7d: warnings || 0,
      risk,
      settings: settingsRow || { auto_approve_comments: true, auto_approve_connects: true, auto_approve_dms: false },
    });
  } catch (err) {
    console.error('[stats/health]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});
