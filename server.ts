import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Load backend routers
import { cronRouter } from './zack-backend/zack-backend/src/routes/cron.js';
import { linkedinRouter } from './zack-backend/zack-backend/src/routes/linkedin.js';
import { prospectsRouter } from './zack-backend/zack-backend/src/routes/prospects.js';
import { queueRouter } from './zack-backend/zack-backend/src/routes/queue.js';
import { voiceRouter } from './zack-backend/zack-backend/src/routes/voice.js';
import { requireAuth } from './zack-backend/zack-backend/src/routes/authMiddleware.js';

async function startServer() {
  const app = express();

  app.use(cors({
    origin: true, // reflects the request's origin - fine for a personal-use app with no public traffic
    credentials: true,
  }));

  app.use(express.json());
  const PORT = 3000;

  // Cron routes are protected by a shared secret, not user auth (no logged-in
  // user when your external cron service pings this).
  app.use('/api/cron', cronRouter);

  // Everything else requires a real Supabase-authenticated user.
  app.use('/api/linkedin', requireAuth, linkedinRouter);
  app.use('/api/prospects', requireAuth, prospectsRouter);
  app.use('/api/queue', requireAuth, queueRouter);
  app.use('/api/voice', requireAuth, voiceRouter);

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
