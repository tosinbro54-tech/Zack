# Zack.ai Backend

Implements the strategy we mapped out: Supabase persistence, encrypted
session vault, a cron-triggered Playwright executor with human-like typing
and pacing, tier-based warm-up sequencing, dedup, rate limiting with
soft/hard pause, and Telegram reporting.

## Setup

1. `npm install` (installs Playwright — it will also download Chromium;
   on Render this happens during build).
2. Run `src/db/schema.sql` in your Supabase project's SQL editor.
3. Copy `.env.example` to `.env` and fill in every value. Generate
   `SESSION_VAULT_KEY` with:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. `npm start`.
5. Point your external cron service at (every 5-15 min):
   `POST https://your-app.onrender.com/api/cron/run-actions`
   header: `x-cron-secret: <your CRON_SECRET>`
   And once daily (e.g. 8pm) at:
   `POST https://your-app.onrender.com/api/cron/daily-report`
   (same header)

## What's real vs. what needs your verification

Everything in `services/` and `jobs/` is fully wired logic — rate limiting,
dedup, encryption, tier math, pacing, pause thresholds all actually work
as discussed.

The one thing that CANNOT be guaranteed correct without you testing it live:
**the LinkedIn DOM selectors in `services/linkedinActions.js`.** LinkedIn's
markup isn't documented and changes over time — every selector in that file
is marked `TODO verify` and needs to be checked against a real logged-in
session (e.g. open devtools on linkedin.com and confirm the selector
actually matches) before this runs unattended. This is the single most
important thing to test before trusting it with real actions.

## Still to wire up (frontend side)

- Replace `AuthView`'s fake `onSuccess()` with real Supabase Auth
- Replace `LinkedinView`'s fake "Verify session" with calls to
  `POST /api/linkedin/session` then `POST /api/linkedin/session/verify`
- Replace `DiscoverView`'s `SAMPLE_POSTS`/`SAMPLE_COMMENTERS` with
  `GET /api/prospects`
- Wire the approval queue UI to `GET/POST /api/queue/...`
- Comment-mining → ICP scoring → prospect capture flow, and the
  connection-request queue builder that reads `ready_to_connect` status
  and enqueues the actual `connect` action, aren't built as endpoints yet —
  next piece to add once the executor core above is verified working.
