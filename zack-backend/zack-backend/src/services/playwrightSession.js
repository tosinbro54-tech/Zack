import { chromium } from 'playwright';

/**
 * Launches a fresh headless browser, injects the stored LinkedIn cookies,
 * and returns { browser, context, page }. Caller MUST close the browser
 * when done (use withSession() below to guarantee cleanup).
 */
export async function launchWithSession({ liAt, jsessionId, proxy }) {
  const launchOpts = { headless: true };
  if (proxy) launchOpts.proxy = { server: proxy };

  let browser;
  try {
    browser = await chromium.launch(launchOpts);
  } catch (err) {
    console.error('[AI Studio] Playwright failed to launch Chromium browser:', err.message);
    throw new Error('Playwright Chromium is not available or missing required system dependencies in this sandbox environment. Please use manual features instead.');
  }

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 },
  });

  await context.addCookies([
    { name: 'li_at', value: liAt, domain: '.linkedin.com', path: '/', httpOnly: true, secure: true },
    { name: 'JSESSIONID', value: jsessionId, domain: '.linkedin.com', path: '/', secure: true },
  ]);

  const page = await context.newPage();
  return { browser, context, page };
}

/** Runs `fn(page)` inside a fresh session and guarantees the browser closes afterward. */
export async function withSession(sessionCreds, fn) {
  const { browser, page } = await launchWithSession(sessionCreds);
  try {
    return await fn(page);
  } finally {
    await browser.close();
  }
}
