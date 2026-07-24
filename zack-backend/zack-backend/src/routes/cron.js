import { Router } from 'express';
import { config } from '../config.js';
import { runDueActionsForAllUsers } from '../jobs/runDueActions.js';
import { runDailyReportForUser } from '../jobs/dailyMaintenance.js';
import { supabase } from '../db/supabaseClient.js';

export const cronRouter = Router();

function requireCronSecret(req, res, next) {
  const provided = req.headers['x-cron-secret'] || req.query.secret;
  if (provided !== config.cronSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// Pinged every 5-15 min by your external cron service.
cronRouter.post('/run-actions', requireCronSecret, async (req, res) => {
  try {
    await runDueActionsForAllUsers();
    res.json({ ok: true });
  } catch (err) {
    console.error('[cron/run-actions]', err);
    res.status(500).json({ error: String(err) });
  }
});

// Pinged once/day (e.g. 8pm) by your external cron service.
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
