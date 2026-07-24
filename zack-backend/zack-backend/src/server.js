import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { cronRouter } from './routes/cron.js';
import { linkedinRouter } from './routes/linkedin.js';
import { prospectsRouter } from './routes/prospects.js';
import { queueRouter } from './routes/queue.js';
import { voiceRouter } from './routes/voice.js';
import { requireAuth } from './routes/authMiddleware.js';

const app = express();

app.use(cors({
  origin: true, // reflects the request's origin - fine for a personal-use app with no public traffic
  credentials: true,
}));

app.use(express.json());

// Cron routes are protected by a shared secret, not user auth (no logged-in
// user when your external cron service pings this).
app.use('/api/cron', cronRouter);

// Everything else requires a real Supabase-authenticated user.
app.use('/api/linkedin', requireAuth, linkedinRouter);
app.use('/api/prospects', requireAuth, prospectsRouter);
app.use('/api/queue', requireAuth, queueRouter);
app.use('/api/voice', requireAuth, voiceRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  console.log(`Zack.ai backend listening on port ${config.port}`);
});
