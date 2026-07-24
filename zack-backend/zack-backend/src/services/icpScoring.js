import { scoreIcpFit } from './gemini.js';

/**
 * Cheap pre-filter using structured/keyword matching only - no API call.
 * Cuts obvious non-fits (and low-signal comments) before spending Gemini
 * quota on the real scoring pass.
 */
export function passesPreFilter({ commentText, headline, icpCriteria }) {
  // Skip near-empty / low-signal comments (emoji-only, "Great post!", etc.)
  const cleaned = (commentText || '').trim();
  if (cleaned.length < 15) return false;
  if (/^(great|nice|love this|🔥|👏|congrats)[\s!.,🔥👏]*$/i.test(cleaned)) return false;

  // If headline available, do a fast keyword check against ICP titles/keywords
  if (headline && icpCriteria?.titleKeywords?.length) {
    const h = headline.toLowerCase();
    const hasAnyKeyword = icpCriteria.titleKeywords.some((k) => h.includes(k.toLowerCase()));
    // Not a hard requirement (headline may be missing/vague) - just used to
    // avoid an obviously-wrong Gemini call when we already know it's a miss
    // AND we have no other signal.
    if (!hasAnyKeyword && !icpCriteria.allowFuzzyMatch) return false;
  }

  return true;
}

/** Full fit evaluation - only called after passesPreFilter() returns true. */
export async function evaluateIcpFit({ headline, about, recentPostTopics, icpCriteria }) {
  return scoreIcpFit({ headline, about, recentPostTopics, icpCriteria });
}
