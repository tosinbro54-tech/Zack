/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Creator, Prospect, QueueItem } from './types';

export const TICKERS = [
  'Autonomous prospecting',
  'Lead discovery',
  'Connection re-ignition',
  'Conversation starter',
  'Pipeline builder',
  'Human-mimic outreach',
  'ICP scanner',
  'Warm intro engine',
  'Network revival',
  'Account-safe by design'
];

export const MODULES = [
  { icon: '🎯', t: 'Autonomous prospecting', d: 'Scout agent scans LinkedIn for ICP-fit buyers 24/7. You wake up to a scored, deduped pipeline.' },
  { icon: '👥', t: 'Connection re-ignition', d: "Mines your dormant 1st-degree network and revives dead contacts with personalised openers." },
  { icon: '💬', t: 'Comment agent', d: 'Drops native, on-voice comments on the posts your buyers read — not generic AI slop.' },
  { icon: '✨', t: 'Post & carousel studio', d: 'Writes posts in your tone, generates hero images, ships multi-slide carousels on cue.' },
  { icon: '🧠', t: 'Reply agent', d: 'Reads your inbox, replies in your tone: Rapport → Probe → Bridge → Book.' },
  { icon: '📊', t: 'Pipeline & CRM brain', d: 'Live status, engagement, full conversation history. Your LinkedIn CRM.' },
  { icon: '🖼', t: 'Image generation', d: 'On-brand hero images and carousel slides via Gemini. No stock photo regret.' },
  { icon: '🛡', t: 'Human-mimic safety', d: 'Randomised timing, daily limits, approve-before-send. Not a bot.' },
  { icon: '📈', t: 'Activity dashboard', d: 'Every action, every reply, every booked call — tracked and attributable.' }
];

export const STEPS = [
  { n: '01', t: 'Connect your LinkedIn session', d: 'Paste your li_at cookie once. Encrypted server-side, never leaves the vault.' },
  { n: '02', t: 'Train your digital twin', d: 'Describe your tone. Paste sample posts. Set your ICP. Zack builds a fingerprint.' },
  { n: '03', t: 'Approve the first batch', d: 'Comments, DMs, and connection notes land in your queue. One click to send.' },
  { n: '04', t: 'Watch the pipeline fill', d: 'Daily action report, scored leads, reply tracking. You show up for booked calls.' }
];

export const SAFETY_PTS = [
  'Daily action ceilings (≈80/day total) — matches a real power user',
  'Randomised timing windows. No mechanical batch sends',
  'Approve-before-send on every outbound action (default)',
  'Residential proxy field for IP-fingerprint match',
  'Pause-on-warning if LinkedIn flags account'
];

export const NAV = [
  { id: 'dashboard', label: 'Mission control', icon: '📊' },
  { id: 'voice', label: 'Voice profile', icon: '🎤' },
  { id: 'linkedin', label: 'LinkedIn session', icon: '🔑' },
  { id: 'discover', label: 'Discover feed', icon: '🧭' },
  { id: 'comments', label: 'Comment agent', icon: '💬' },
  { id: 'studio', label: 'Post & carousel studio', icon: '✨' },
  { id: 'prospects', label: 'Prospects (CRM)', icon: '👥' },
  { id: 'outreach', label: 'Outreach drafts', icon: '📤' },
  { id: 'inbox', label: 'Inbox + reply agent', icon: '📥' },
  { id: 'queue', label: 'Approval queue', icon: '📋' },
  { id: 'health', label: 'Account health', icon: '🛡' }
];

export const INITIAL_QUEUE_ITEMS: QueueItem[] = [
  { id: 1, type: 'Comment', typeColor: 'badge-blue', target: 'Marcus Webb — "AI in SaaS sales…"', text: "This is the exact shift I've been seeing. The teams doubling down on warm signals are cleaning up.", dismissed: false },
  { id: 2, type: 'Connect', typeColor: 'badge-amber', target: 'Amara Diallo — CEO @ Fundstack', text: 'Loved your breakdown on fintech GTM. Building in the same space — would be great to connect.', dismissed: false },
  { id: 3, type: 'DM', typeColor: 'badge-amber', target: 'Priya Nair', text: 'Hey Priya, your content POV piece was exactly right. Worth a quick chat this week?', dismissed: false },
  { id: 4, type: 'Comment', typeColor: 'badge-blue', target: 'Sarah Okonkwo — "Precision over volume…"', text: "Spot on. 2 posts/week to the right ICP vs 7 posts to everyone — we see this in data too.", dismissed: false }
];

export const INITIAL_PROSPECTS: Prospect[] = [
  { id: 1, name: 'Sarah Okonkwo', hl: 'VP GTM @ Paydeck', co: 'Paydeck', score: 92, status: 'connected' },
  { id: 2, name: 'Tunde Adesola', hl: 'VP Sales @ Verto FX', co: 'Verto FX', score: 87, status: 'messaged' },
  { id: 3, name: 'Marcus Webb', hl: 'Founder @ Closerstack', co: 'Closerstack', score: 79, status: 'replied' },
  { id: 4, name: 'Priya Nair', hl: 'Content Lead @ Orbit', co: 'Orbit', score: 74, status: 'new' },
  { id: 5, name: 'David Osei', hl: 'Head of Growth @ Paystack', co: 'Paystack', score: 68, status: 'queued' },
  { id: 6, name: 'Amara Diallo', hl: 'CEO @ Fundstack', co: 'Fundstack', score: 61, status: 'booked' }
];

export const INITIAL_CREATORS: Creator[] = [
  { id: 1, slug: 'marcuswebb', name: 'Marcus Webb', hl: 'Founder @ Closerstack', posts_per_week: 4, avg_reactions: 89 },
  { id: 2, slug: 'sarahokonkwo', name: 'Sarah Okonkwo', hl: 'VP GTM @ Paydeck', posts_per_week: 3, avg_reactions: 142 }
];

export const INITIAL_ICP = {
  titles: ['VP Sales', 'Founder', 'Head of Growth', 'CEO'],
  industries: ['B2B SaaS', 'Fintech'],
  locations: ['Nigeria', 'Kenya', 'South Africa'],
  keywords: ['outreach', 'pipeline', 'GTM', 'B2B']
};

export const SAMPLE_POSTS = [
  { urn: 'urn:li:activity:1', url: '#', text: "Most sales teams are still cold-emailing like it's 2018. The warm signal era is here. Comment on their posts, react before you DM, and your reply rate 3x.", author: 'Marcus Webb', hl: 'Founder @ Closerstack · B2B SaaS', reactions: 147, comments: 38 },
  { urn: 'urn:li:activity:2', url: '#', text: "Unpopular opinion: your LinkedIn content strategy doesn't need more posts. It needs more precision. 2 posts/week to the right ICP >> 7 posts/week to anyone who scrolls.", author: 'Sarah Okonkwo', hl: 'VP GTM @ Paydeck · Fintech', reactions: 203, comments: 54 },
  { urn: 'urn:li:activity:3', url: '#', text: "B2B content in 2026: Stop writing for search, start writing for trust. The brands winning right now are the ones with a point of view.", author: 'Priya Nair', hl: 'Content Lead @ Orbit · SaaS', reactions: 89, comments: 21 }
];

export const SAMPLE_COMMENTERS = [
  { name: 'David Osei', hl: 'Head of Growth @ Paystack', comment: "This is exactly what we've been struggling with. How do you recommend starting?", score: 80, reason: 'title match: head of growth, substantive comment' },
  { name: 'Amara Diallo', hl: 'CEO @ Fundstack', comment: "Agreed. We switched to signal-led outreach last quarter and pipeline doubled.", score: 60, reason: 'keyword: outreach, substantive comment' },
  { name: 'Kemi Adeyemi', hl: 'VP Sales @ Flutterwave', comment: "Worth adding: follow-up timing matters. 24h window after they post is gold.", score: 80, reason: 'title match: VP sales, substantive comment' }
];

export const INBOX_MSGS = [
  { id: 1, av: 'SO', name: 'Sarah Okonkwo', prev: "Looks interesting! Can you tell me more about how the cookie thing works?", time: '3m', unread: true },
  { id: 2, av: 'TA', name: 'Tunde Adesola', prev: "Yeah I'm open to a quick call. Thursday works — what time zone?", time: '1h', unread: true },
  { id: 3, av: 'MW', name: 'Marcus Webb', prev: "Good question. I'll DM you the case study. Give me 24h.", time: '4h', unread: false },
  { id: 4, av: 'DO', name: 'David Osei', prev: "Appreciate the note. Let's reconnect — been a while.", time: '1d', unread: false }
];
