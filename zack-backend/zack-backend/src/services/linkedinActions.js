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

  // TODO verify selector: LinkedIn's comment box is usually inside a
  // div[role="textbox"] under the comments section.
  const commentBox = page.locator('div.comments-comment-box [role="textbox"]').first();
  await commentBox.scrollIntoViewIfNeeded();
  await humanType(commentBox, commentText);

  // TODO verify selector: the submit/post button near the comment box.
  const submitBtn = page.locator('button.comments-comment-box__submit-button').first();
  await submitBtn.click();

  return { success: true };
}

export async function sendConnectionRequest(page, { profileUrl, note }) {
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });

  const auth = detectAuthProblem(page);
  if (auth.problem) return { success: false, ...auth };

  // TODO verify selector: "Connect" button, sometimes behind a "More" menu.
  const connectBtn = page.getByRole('button', { name: /connect/i }).first();
  await connectBtn.click();

  if (note) {
    // TODO verify: "Add a note" flow opens a textarea before final send.
    const addNoteBtn = page.getByRole('button', { name: /add a note/i }).first();
    if (await addNoteBtn.isVisible().catch(() => false)) {
      await addNoteBtn.click();
      const noteBox = page.locator('textarea[name="message"]').first();
      await humanType(noteBox, note);
    }
  }

  const sendBtn = page.getByRole('button', { name: /^send$/i }).first();
  await sendBtn.click();

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
