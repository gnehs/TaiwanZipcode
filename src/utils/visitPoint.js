// Crawlers named in their User-Agent, matched case-insensitively in order.
const CRAWLERS = [
  'Googlebot',
  'Google-InspectionTool',
  'Storebot-Google',
  'bingbot',
  'Applebot',
  'DuckDuckBot',
  'YandexBot',
  'Baiduspider',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'facebookexternalhit',
  'Twitterbot',
  'Slackbot',
  'Discordbot',
  'TelegramBot',
  'LinkedInBot',
  'WhatsApp',
  'SemrushBot',
  'AhrefsBot',
];

const OTHER_CRAWLER = /bot\b|crawl|spider|scrap|headless|curl\/|wget\/|python-|go-http-client|node-fetch|axios\//i;

export function crawlerName(userAgent) {
  if (!userAgent) return 'other';
  const ua = userAgent.toLowerCase();
  const known = CRAWLERS.find((name) => ua.includes(name.toLowerCase()));
  if (known) return known;
  return OTHER_CRAWLER.test(userAgent) ? 'other' : null;
}

// One Analytics Engine data point per address page request. A crawler's
// point keeps the page it fetched; a person's point says only that someone
// opened an address page, never which address.
export function visitPoint(userAgent, path) {
  const crawler = crawlerName(userAgent);
  if (crawler) return { indexes: ['crawler'], blobs: ['crawler', crawler, path] };
  return { indexes: ['person'], blobs: ['person', '', ''] };
}
