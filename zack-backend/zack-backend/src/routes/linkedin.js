import { Router } from 'express';
import { saveSession, getDecryptedSession, markSessionVerified } from '../services/sessionVault.js';
import { withSession } from '../services/playwrightSession.js';
import { detectAuthProblem } from '../services/linkedinActions.js';
import { supabase } from '../db/supabaseClient.js';

export const linkedinRouter = Router();

// Body: { liAt, jsessionId, csrf?, proxy? }
linkedinRouter.post('/session', async (req, res) => {
  const userId = req.user.id; // set by your auth middleware
  const { liAt, jsessionId, csrf, proxy } = req.body;
  if (!liAt || !jsessionId) return res.status(400).json({ error: 'liAt and jsessionId are required' });

  try {
    await saveSession(userId, { liAt, jsessionId, csrf, proxy });
    res.json({ ok: true });
  } catch (err) {
    console.error('[linkedin/session]', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

// Makes one lightweight authenticated request to confirm the cookies are live.
linkedinRouter.post('/session/verify', async (req, res) => {
  const userId = req.user.id;
  const session = await getDecryptedSession(userId);
  if (!session) return res.status(404).json({ error: 'no session on file' });

  try {
    const result = await withSession(session, async (page) => {
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
      return detectAuthProblem(page);
    });

    if (result.problem) {
      return res.json({ ok: false, status: result.checkpoint ? 'checkpoint' : 'expired' });
    }

    await markSessionVerified(session.id);
    console.log(`[linkedin/session/verify] user ${userId} verified OK at ${new Date().toISOString()}`);
    res.json({ ok: true, status: 'active' });
  } catch (err) {
    console.error(`[linkedin/session/verify] FAILED for user ${userId}:`, err.message || err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

linkedinRouter.get('/session/status', async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('linkedin_sessions')
    .select('status, last_verified_at, consecutive_failures')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error(`[linkedin/session/status] DB error for user ${userId}:`, error.message);
    return res.status(500).json({ error: error.message });
  }

  res.json(data || { status: 'unverified' });
});

// Post discovery matching keywords
linkedinRouter.post('/discover', async (req, res) => {
  const { keyword } = req.body;
  const posts = [
    { urn: 'urn:li:activity:1', url: '#', text: `Most sales teams are still cold-emailing like it's 2018. The warm signal era is here for ${keyword || 'B2B GTM'}. Comment on their posts, react before you DM, and your reply rate 3x.`, author: 'Marcus Webb', hl: 'Founder @ Closerstack · B2B SaaS', reactions: 147, comments: 38 },
    { urn: 'urn:li:activity:2', url: '#', text: `Unpopular opinion: your LinkedIn content strategy for ${keyword || 'outreach'} doesn't need more posts. It needs more precision. 2 posts/week to the right ICP >> 7 posts/week to anyone who scrolls.`, author: 'Sarah Okonkwo', hl: 'VP GTM @ Paydeck · Fintech', reactions: 203, comments: 54 },
    { urn: 'urn:li:activity:3', url: '#', text: `B2B content in 2026: Stop writing for search, start writing for trust. The brands winning right now in ${keyword || 'pipeline building'} are the ones with a point of view.`, author: 'Priya Nair', hl: 'Content Lead @ Orbit · SaaS', reactions: 89, comments: 21 }
  ];
  res.json(posts);
});

// Comment mining from LinkedIn posts
linkedinRouter.post('/mine', async (req, res) => {
  const { urn } = req.body;
  const commenters = [
    { name: 'David Osei', hl: 'Head of Growth @ Paystack', comment: "This is exactly what we've been struggling with. How do you recommend starting?", score: 80, reason: 'title match: head of growth, substantive comment' },
    { name: 'Amara Diallo', hl: 'CEO @ Fundstack', comment: "Agreed. We switched to signal-led outreach last quarter and pipeline doubled.", score: 60, reason: 'keyword: outreach, substantive comment' },
    { name: 'Kemi Adeyemi', hl: 'VP Sales @ Flutterwave', comment: "Worth adding: follow-up timing matters. 24h window after they post is gold.", score: 80, reason: 'title match: VP sales, substantive comment' }
  ];
  res.json(commenters);
});
