import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { cronRouter } from './routes/cron.js';
import { linkedinRouter } from './routes/linkedin.js';
import { prospectsRouter } from './routes/prospects.js';
import { queueRouter } from './routes/queue.js';
import { voiceRouter } from './routes/voice.js';
import { inboxRouter } from './routes/inbox.js';
import { aiRouter } from './routes/ai.js';
import { icpRouter } from './routes/icp.js';
import { statsRouter } from './routes/stats.js';
import { requireAuth } from './routes/authMiddleware.js';

const app = express();

// Safety net: in Express 4, a thrown/rejected error inside an async route
// handler that isn't try/caught becomes an unhandled promise rejection at
// the process level - and Node 15+ kills the whole process on those by
// default. That means ANY bad request to ANY unguarded route can take the
// entire backend down for every user. This doesn't fix the underlying gap
// (routes should still try/catch and return a proper error response) but
// it stops one bad request from being a full outage while those get fixed.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

app.use('/api/cron', cronRouter);

app.use('/api/linkedin', requireAuth, linkedinRouter);
app.use('/api/prospects', requireAuth, prospectsRouter);
app.use('/api/queue', requireAuth, queueRouter);
app.use('/api/voice', requireAuth, voiceRouter);
app.use('/api/inbox', requireAuth, inboxRouter);
app.use('/api/ai', requireAuth, aiRouter);
app.use('/api/icp', requireAuth, icpRouter);
app.use('/api/stats', requireAuth, statsRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  console.log(`Zack.ai backend listening on port ${config.port}`);
});
