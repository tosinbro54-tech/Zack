function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Types text into a Playwright locator one character at a time using real
 * keyboard events (not `.fill()`, which pastes instantly and is an easy tell).
 * Adds per-character jitter, occasional thinking-pauses, and occasional
 * backspace-and-retype "mistakes" to look like real human typing.
 */
export async function humanType(locator, text, opts = {}) {
  const {
    minDelay = 40,
    maxDelay = 180,
    mistakeChance = 0.03, // 3% chance per character of a backspace-correction
    thinkPauseChance = 0.05, // 5% chance per character of a longer pause
  } = opts;

  await locator.click();
  await sleep(randInt(300, 1200)); // brief pause before typing starts, like re-reading the post

  for (const char of text) {
    // occasional "mistake": type a wrong-ish key, pause, backspace, then continue
    if (Math.random() < mistakeChance) {
      await locator.press(char);
      await sleep(randInt(150, 400));
      await locator.press('Backspace');
      await sleep(randInt(100, 300));
    }

    await locator.press(char === ' ' ? 'Space' : char.length === 1 ? char : char);
    await sleep(randInt(minDelay, maxDelay));

    if (Math.random() < thinkPauseChance) {
      await sleep(randInt(400, 1500));
    }
  }

  // pause after typing, before submitting - humans reread before posting
  await sleep(randInt(800, 2500));
}
