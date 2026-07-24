import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (!v) console.warn(`[config] Missing env var ${name} — set it before this feature will work.`);
  return v;
}

export const config = {
  port: process.env.PORT || 3000,
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  sessionVaultKey: required('SESSION_VAULT_KEY'),
  geminiApiKey: required('GEMINI_API_KEY'),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
  cronSecret: required('CRON_SECRET'),

  // Default daily caps (overridable per-user via user_settings.daily_caps)
  defaultCaps: {
    comment: 30,
    connect: 18,
    dm: 22,
    scan_profile_views: 180,
  },

  // Delay ranges in ms, by action type — [min, max]
  delayRanges: {
    comment: [20_000, 90_000],
    connect: [120_000, 600_000],
    dm: [30 * 60_000, 4 * 60 * 60_000],
    scan_between_items: [3_000, 8_000],
  },

  // Minimum gap between ANY two actions, regardless of type
  minGapMs: 15_000,

  // Warm-up tiers
  tiers: {
    frequent: { minPostsPerWeek: 2, commentsRequired: 5, expiryDays: 45 },
    moderate: { minPostsPerWeek: 0.5, commentsRequired: 3, expiryDays: 35 },
    infrequent: { minPostsPerWeek: 0, commentsRequired: 2, expiryDays: 30 },
  },

  // Pause thresholds
  softPauseRetries: 1,
  hardPauseConsecutiveFailures: 2,
};
