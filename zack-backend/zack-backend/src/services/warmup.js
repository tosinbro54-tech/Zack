import { config } from '../config.js';

/**
 * Given a list of post timestamps found while scrolling a profile (varied
 * scroll depth per profile - see note below), compute posts/week using the
 * ACTUAL span covered, then classify into a tier.
 *
 * postDates: array of JS Date, only those within the true ~3-month mark
 * (any extra "overscroll" posts collected purely for human-like browsing
 * behavior should be discarded before calling this).
 */
export function classifyFrequency(postDates) {
  if (!postDates || postDates.length === 0) {
    return { postsPerWeek: 0, tier: 'infrequent' };
  }

  const sorted = [...postDates].sort((a, b) => a - b);
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];
  const spanDays = Math.max(1, (newest - oldest) / (1000 * 60 * 60 * 24));
  const spanWeeks = Math.max(1 / 7, spanDays / 7);

  const postsPerWeek = postDates.length / spanWeeks;

  let tier = 'infrequent';
  if (postsPerWeek >= config.tiers.frequent.minPostsPerWeek) tier = 'frequent';
  else if (postsPerWeek >= config.tiers.moderate.minPostsPerWeek) tier = 'moderate';

  return { postsPerWeek: Math.round(postsPerWeek * 100) / 100, tier };
}

/** How many landed comments are required before a connection request fires. */
export function commentsRequiredForTier(tier) {
  return config.tiers[tier]?.commentsRequired ?? config.tiers.infrequent.commentsRequired;
}

/** Days before an un-accepted connection request should be flagged for review. */
export function expiryDaysForTier(tier) {
  return config.tiers[tier]?.expiryDays ?? config.tiers.infrequent.expiryDays;
}

/**
 * Random overscroll target (in days beyond the true 3-month mark) so scroll
 * depth varies per profile visit and doesn't look scripted.
 */
export function randomOverscrollDays() {
  const minExtra = 14; // 2 weeks
  const maxExtra = 42; // 6 weeks
  return Math.floor(Math.random() * (maxExtra - minExtra + 1)) + minExtra;
}
