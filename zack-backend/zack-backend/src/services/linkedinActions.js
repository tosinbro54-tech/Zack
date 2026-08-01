import { humanType } from './humanType.js';

/**
 * IMPORTANT: LinkedIn's DOM structure and class names change over time and
 * are not publicly documented/stable. The selectors below are best-effort
 * starting points (LinkedIn commonly uses data-test-id / aria-label
 * attributes, which are more stable than class names) — verify each one
 * against the live site with a real logged-in session before relying on
 * this in production, and expect to update them when LinkedIn ships UI
 * changes.
 */

// Signals that the session is dead or LinkedIn has thrown up a checkpoint.
export function detectAuthProblem(page) {
  const url = page.url();
  if (url.includes('/checkpoint/') || url.includes('/uas/login') || url.includes('/authwall')) {
    return { problem: true, checkpoint: url.includes('/checkpoint/') };
  }
  return { problem: false };
}

export async function commentOnPost(page, { postUrl, commentText }) {
  await page.goto(postUrl, { waitUntil: 'domcontentloaded' });

  const auth = detectAuthProblem(page);
  if (auth.problem) return { success: false, ...auth };

  const commentBox = page
    .locator('div[aria-label="Text editor for creating comment"][contenteditable="true"]')
    .first();
  await commentBox.scrollIntoViewIfNeeded();
  await humanType(commentBox, commentText);

  const submitBtn = page.getByRole('button', { name: 'Comment', exact: true }).first();
  await submitBtn.click();

  return { success: true };
}

export async function sendConnectionRequest(page, { profileUrl, note }) {
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });

  const auth = detectAuthProblem(page);
  if (auth.problem) return { success: false, ...auth };

  const connectBtn = page.getByRole('button', { name: /connect/i }).first();
  await connectBtn.click();

  if (note) {
    const addNoteBtn = page.getByRole('button', { name: 'Add a note', exact: true }).first();
    if (await addNoteBtn.isVisible().catch(() => false)) {
      await addNoteBtn.click();
      const noteBox = page.locator('textarea[name="message"]').first();
      await humanType(noteBox, note);

      const sendBtn = page.getByRole('button', { name: 'Send invitation', exact: true }).first();
      await sendBtn.click();
    } else {
      // No "Add a note" option appeared (some accounts/regions skip straight to send) - fall through to plain send.
      const sendBtn = page.getByRole('button', { name: /^send/i }).first();
      await sendBtn.click();
    }
  } else {
    const sendWithoutNoteBtn = page.getByRole('button', { name: 'Send without a note', exact: true }).first();
    await sendWithoutNoteBtn.click();
  }

  return { success: true };
}

export async function sendDirectMessage(page, { profileUrl, messageText }) {
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });

  const auth = detectAuthProblem(page);
  if (auth.problem) return { success: false, ...auth };

  const messageBtn = page.getByRole('button', { name: /^message$/i }).first();
  await messageBtn.click();

  const msgBox = page.locator('div.msg-form__contenteditable[role="textbox"]').first();
  await humanType(msgBox, messageText);

  const sendBtn = page.getByRole('button', { name: /^send$/i }).first();
  await sendBtn.click();

  return { success: true };
}

/**
 * Reads a profile's headline and About text for ICP scoring. LinkedIn gives
 * neither of these stable class names to hook into, so this walks the DOM
 * structurally instead:
 *  - Headline: the person's name sits in the page's <h1>, and the headline
 *    is the next text-bearing element after it in the top-card container.
 *  - About: found via the section whose heading text reads "About", then
 *    the real data-testid="expandable-text-box" hook inside that section.
 */
export async function scanProfileForScoring(page, { profileUrl }) {
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });

  const auth = detectAuthProblem(page);
  if (auth.problem) return { success: false, ...auth, headline: null, about: null };

  let headline = '';
  try {
    await page.locator('h1').first().waitFor({ timeout: 8000 });
    headline = await page.evaluate(() => {
      const h1El = document.querySelector('h1');
      if (!h1El) return '';
      let sibling = h1El.nextElementSibling;
      while (sibling) {
        const text = sibling.textContent?.trim();
        if (text) return text;
        sibling = sibling.nextElementSibling;
      }
      return '';
    });
  } catch {
    headline = '';
  }

  let about = '';
  try {
    about = await page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll('section'));
      const aboutSection = sections.find((s) => {
        const heading = s.querySelector('h2');
        return heading && heading.textContent?.trim().toLowerCase().startsWith('about');
      });
      if (!aboutSection) return '';
      const box = aboutSection.querySelector('[data-testid="expandable-text-box"]');
      return box ? (box.textContent?.trim() || '') : '';
    });
  } catch {
    about = '';
  }

  return { success: true, headline, about };
}

/**
 * Scrolls a profile's activity feed collecting post URNs + timestamps + text,
 * pausing between items to look human. Stops once `targetCount` posts are
 * collected or `maxScrollDays` of overscroll budget is exhausted.
 */
export async function scanProfileActivity(page, { profileUrl, targetCount, pacing }) {
  await page.goto(`${profileUrl}/recent-activity/all/`, { waitUntil: 'domcontentloaded' });

  const auth = detectAuthProblem(page);
  if (auth.problem) return { success: false, ...auth, posts: [] };

  const posts = [];
  // TODO verify selector: each activity feed item container.
  const postSelector = 'div.feed-shared-update-v2';

  while (posts.length < targetCount) {
    const items = await page.locator(postSelector).all();
    for (const item of items.slice(posts.length)) {
      // TODO verify: post text, timestamp, and URN extraction per item.
      const text = await item.innerText().catch(() => '');
      const urn = await item.getAttribute('data-urn').catch(() => null);
      if (urn) posts.push({ urn, text, scannedAt: new Date().toISOString() });
    }

    if (posts.length >= targetCount) break;

    await page.mouse.wheel(0, 800 + Math.random() * 400);
    const [min, max] = pacing || [3000, 8000];
    await new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

    const reachedEnd = items.length === 0;
    if (reachedEnd) break;
  }

  return { success: true, posts };
}

/** Reads the comment section of a post for prospect-mining. */
export async function mineComments(page, { postUrl }) {
  await page.goto(postUrl, { waitUntil: 'domcontentloaded' });

  const auth = detectAuthProblem(page);
  if (auth.problem) return { success: false, ...auth, comments: [] };

  // TODO verify selector: individual comment items + author profile link.
  const commentItems = await page.locator('article.comments-comment-item').all();
  const comments = [];
  for (const c of commentItems) {
    const text = await c.innerText().catch(() => '');
    const profileHref = await c.locator('a[href*="/in/"]').first().getAttribute('href').catch(() => null);
    if (profileHref && text.trim().length > 0) {
      comments.push({ text: text.trim(), profileUrl: profileHref.split('?')[0] });
    }
  }

  return { success: true, comments };
}

/**
 * Opens each conversation in the list (list rows have no scrapeable URL of
 * their own - LinkedIn only reveals it once you navigate in, so this clicks
 * through like a human would) and captures the real thread URL + messages
 * in one pass.
 */
export async function scanInboxSummary(page, { maxConversations = 10 } = {}) {
  await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded' });

  const auth = detectAuthProblem(page);
  if (auth.problem) return { success: false, ...auth, conversations: [] };

  const rows = await page.locator('li.msg-conversation-listitem').all();
  const conversations = [];

  for (const row of rows.slice(0, maxConversations)) {
    const name = await row.locator('.msg-conversation-listitem__participant-names').first().innerText().catch(() => '');
    const isUnread = await row.locator('.msg-conversation-card__unread-count').count().then(c => c > 0).catch(() => false);
    // Strip a leading "Name: " prefix - LinkedIn shows it for both "You:" and the other person's name.
    const rawPreview = await row.locator('.msg-conversation-card__message-snippet').first().innerText().catch(() => '');
    const preview = rawPreview.replace(/^[^:]{1,40}:\s*/, '').trim();

    const clickable = row.locator('.msg-conversation-listitem__link').first();
    await clickable.click().catch(() => {});
    await page.waitForTimeout(1000 + Math.random() * 1500); // let the thread load, human-paced

    const conversationUrl = page.url();
    const urnMatch = conversationUrl.match(/thread\/([^/]+)\//);
    const urn = urnMatch ? urnMatch[1] : conversationUrl;

    const profileUrl = await page.locator('a[href*="/in/"]').first().getAttribute('href').catch(() => null);

    conversations.push({
      urn,
      name: name.trim(),
      preview,
      conversationUrl,
      profileUrl: profileUrl ? profileUrl.split('?')[0] : null,
      isUnread,
    });

    await page.waitForTimeout(500 + Math.random() * 1000); // pause between rows
  }

  return { success: true, conversations };
}

/** Opens one thread and reads its message history. */
export async function scanConversationThread(page, { conversationUrl }) {
  await page.goto(conversationUrl, { waitUntil: 'domcontentloaded' });

  const auth = detectAuthProblem(page);
  if (auth.problem) return { success: false, ...auth, messages: [] };

  const items = await page.locator('li.msg-s-message-list__event').all();
  const messages = [];

  for (const item of items) {
    const eventDiv = item.locator('div.msg-s-event-listitem').first();
    const classAttr = await eventDiv.getAttribute('class').catch(() => '');
    const isFromOther = (classAttr || '').includes('msg-s-event-listitem--other');

    const bodyEls = await item.locator('p.msg-s-event-listitem__body').all();
    for (const body of bodyEls) {
      const text = await body.innerText().catch(() => '');
      if (text.trim()) {
        messages.push({ sender: isFromOther ? 'them' : 'me', text: text.trim() });
      }
    }
  }

  return { success: true, messages };
}

/** Sends a reply in an EXISTING thread (different from sendDirectMessage, which opens a new/first thread from a profile). */
export async function sendReplyInThread(page, { conversationUrl, text }) {
  await page.goto(conversationUrl, { waitUntil: 'domcontentloaded' });

  const auth = detectAuthProblem(page);
  if (auth.problem) return { success: false, ...auth };

  const msgBox = page.locator('div.msg-form__contenteditable[role="textbox"]').first();
  await humanType(msgBox, text);

  const sendBtn = page.getByRole('button', { name: /^send$/i }).first();
  await sendBtn.click();

  return { success: true };
}