// ============================================
// TRANSHERE v1.1 - BOT DETECTION UTILITY
// ============================================

/**
 * Environment flag to enable debug bypass.
 * Set ALLOW_DEBUG_TRACKING=true in .env.local for testing.
 */
const ALLOW_DEBUG_BYPASS = process.env.ALLOW_DEBUG_TRACKING === 'true';

/**
 * Magic query param that forces human classification.
 * Only works when ALLOW_DEBUG_TRACKING=true.
 */
export const DEBUG_BYPASS_PARAM = 'th_debug';
export const DEBUG_BYPASS_VALUE = 'human';

/**
 * Comprehensive regex pattern for detecting common bots and crawlers.
 * This list covers major search engines, social media crawlers, and monitoring tools.
 */
const BOT_PATTERNS: RegExp[] = [
  // Search engine crawlers
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /duckduckbot/i,
  /baiduspider/i,
  /sogou/i,
  /exabot/i,
  /ia_archiver/i,

  // Social media crawlers
  /facebookexternalhit/i,
  /facebot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /pinterest/i,
  /slackbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /discordbot/i,

  // SEO and monitoring tools
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /rogerbot/i,
  /screaming frog/i,
  /seokicks/i,

  // Generic bot patterns
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /headless/i,
  /phantom/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,

  // Uptime monitors and validators
  /uptimerobot/i,
  /pingdom/i,
  /statuscake/i,
  /site24x7/i,
  /gtmetrix/i,
  /pagespeed/i,
  /lighthouse/i,
  /w3c_validator/i,

  // Preview generators
  /preview/i,
  /thumbnail/i,
  /snap/i,
  /archive/i,

  // Cloud services
  /cloudflare/i,
  /amazon.*bot/i,
  /petalbot/i,
];

/**
 * Check if a User-Agent string indicates a bot or crawler.
 * Returns true if the User-Agent matches any known bot pattern.
 * 
 * @param userAgent - The User-Agent header string to check
 * @param debugBypass - Optional flag to force human classification (for testing)
 * @returns boolean - true if bot detected, false otherwise
 */
export function isBot(userAgent: string | null, debugBypass: boolean = false): boolean {
  // Debug bypass: Force human classification for testing
  if (ALLOW_DEBUG_BYPASS && debugBypass) {
    console.log('[BotDetection] Debug bypass active - treating as human');
    return false;
  }

  if (!userAgent) {
    // No User-Agent is suspicious, treat as potential bot
    return true;
  }

  // Check against all bot patterns
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

/**
 * Helper to check for debug bypass in URL search params.
 * Usage: const bypass = hasDebugBypass(request.url);
 * 
 * @param url - The full request URL
 * @returns boolean - true if debug bypass param is present and valid
 */
export function hasDebugBypass(url: string): boolean {
  if (!ALLOW_DEBUG_BYPASS) return false;

  try {
    const searchParams = new URL(url).searchParams;
    return searchParams.get(DEBUG_BYPASS_PARAM) === DEBUG_BYPASS_VALUE;
  } catch {
    return false;
  }
}

/**
 * Extract a clean, truncated User-Agent for logging.
 * Limits length to prevent database bloat.
 * 
 * @param userAgent - The raw User-Agent string
 * @param maxLength - Maximum length to store (default: 500)
 * @returns string | null - Cleaned User-Agent or null
 */
export function sanitizeUserAgent(
  userAgent: string | null,
  maxLength: number = 500
): string | null {
  if (!userAgent) return null;

  // Trim whitespace and limit length
  const cleaned = userAgent.trim();
  return cleaned.length > maxLength
    ? cleaned.substring(0, maxLength)
    : cleaned;
}
