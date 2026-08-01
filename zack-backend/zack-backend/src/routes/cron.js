import { Router } from 'express';
import { config } from '../config.js';
import { runDueActionsForAllUsers } from '../jobs/runDueActions.js';
import { runDailyReportForUser } from '../jobs/dailyMaintenance.js';
import { supabase } from '../db/supabaseClient.js';
import { discoverNewPostsForUser } from '../services/discovery.js';
import { syncInboxSummaryForUser } from '../services/inboxSync.js';
import { buildConnectQueueForUser } from '../services/connectQueueBuilder.js';

export const cronRouter = Router();

function requireCronSecret(req, res, next) {
  const provided = req.headers['x-cron-secret'] || req.query.secret;
  if (provided !== config.cronSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

cronRouter.post('/run-actions', requireCronSecret, async (req, res) => {
  try {
    await runDueActionsForAllUsers();

    const { data: activeUsers } = await supabase.from('linkedin_sessions').select('user_id').eq('status', 'active');
    for (const u of activeUsers || []) {
      await discoverNewPostsForUser(u.user_id).catch((err) => console.error('[discovery]', err));
      await buildConnectQueueForUser(u.user_id).catch((err) => console.error('[connect-queue]', err));
      await syncInboxSummaryForUser(u.user_id).catch((err) => console.error('[inbox-sync]', err));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[cron/run-actions]', err);
    res.status(500).json({ error: String(err) });
  }
});

cronRouter.post('/daily-report', requireCronSecret, async (req, res) => {
  try {
    const { data: users } = await supabase.from('linkedin_sessions').select('user_id');
    for (const u of users || []) {
      await runDailyReportForUser(u.user_id);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[cron/daily-report]', err);
    res.status(500).json({ error: String(err) });
  }
});
