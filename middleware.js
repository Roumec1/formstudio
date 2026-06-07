/*
 * Vercel Edge Middleware — language geo-routing for the homepage.
 *
 * Runs ONLY on "/" (see config.matcher). The explicit language URLs
 * /de, /en, /sk are never touched, so a shared link always lands exactly
 * where it points.
 *
 * Decision order for a visitor of "/":
 *   1. "floc" cookie (a manual choice, set by index.html) wins.
 *   2. Otherwise the visitor's country (Vercel header) maps to a language.
 *   3. Czech visitors / unknown-but-mapped-to-cs stay on "/".
 *
 * Safeguards:
 *   - Search-engine crawlers and link-preview bots are never redirected,
 *     so the Czech homepage stays the indexable canonical and shared links
 *     of "/" still preview correctly.
 *   - Uses a 307 (temporary) redirect — the right page depends on the
 *     visitor, not a permanent move, so Google won't recanonicalize.
 *   - Manual language switching is respected via the "floc" cookie.
 */

export const config = { matcher: '/' };

// Country (ISO-3166-1 alpha-2) -> site language. Anything not listed -> English.
const COUNTRY_LANG = {
  CZ: 'cs',
  SK: 'sk',
  DE: 'de', AT: 'de', CH: 'de', LI: 'de', // German-speaking
};
const FALLBACK = 'en';

const BOT = /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|whatsapp|telegram|twitterbot|linkedinbot|embedly|quora|pinterest|slackbot|discordbot|skypeuripreview|preview|google|bing|duckduck|yandex|baidu|applebot|petalbot|ahrefs|semrush/i;

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (BOT.test(ua)) return; // let crawlers & link previews see the canonical "/"

  const cookie = request.headers.get('cookie') || '';
  const saved = (cookie.match(/(?:^|;\s*)floc=(cs|sk|en|de)\b/) || [])[1];

  let lang = saved;
  if (!lang) {
    const country = (request.headers.get('x-vercel-ip-country') || '').toUpperCase();
    lang = COUNTRY_LANG[country] || FALLBACK;
  }

  if (lang === 'cs') return; // already the right page

  const url = new URL(request.url);
  url.pathname = '/' + lang;
  return new Response(null, {
    status: 307,
    headers: {
      Location: url.toString(),
      'Set-Cookie': `floc=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`,
      'Cache-Control': 'no-store',
    },
  });
}
