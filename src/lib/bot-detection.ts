// ============================================
// TRANSHERE v1.1 - BOT DETECTION UTILITY
// ============================================

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
 * @returns boolean - true if bot detected, false otherwise
 */
export function isBot(userAgent: string | null): boolean {
  if (!userAgent) {
    // No User-Agent is suspicious, treat as potential bot
    return true;
  }
  
  // Check against all bot patterns
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
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
