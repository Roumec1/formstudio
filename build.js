/*
 * Generates one crawlable HTML page per language from index.html (the Czech source).
 * Outputs: index.html (cs), de.html, en.html, sk.html
 * Run:  node build.js   (re-run after editing index.html)
 * Vercel cleanUrls serves these at /, /de, /en, /sk.
 */
const fs = require('fs');
const BASE = 'https://formastudio.cz';

const ALL = [['cs', 'cs_CZ'], ['sk', 'sk_SK'], ['en', 'en_US'], ['de', 'de_DE']];

const META = {
  cs: {
    file: 'index.html', loc: 'cs_CZ', url: BASE + '/',
    title: 'Forma Studio — CNC, 3D tisk, Laser · Šumperk',
    desc: 'Proměníme váš soubor v hotový výrobek. Velkoformátové CNC frézování, 100W laser, 3D tisková farma. Komplexní projekty vítány, série od 1 kusu. Šumperk, Česká republika.',
    social: 'Výroba na zakázku. Velkoformátové CNC frézování, 100W laser, 3D tisková farma. Od prototypu po tisícové série. Šumperk.',
    wa: 'Dobrý den, mám dotaz na Forma Studio.'
  },
  sk: {
    file: 'sk.html', loc: 'sk_SK', url: BASE + '/sk',
    title: 'Forma Studio — CNC, 3D tlač, Laser · Šumperk',
    desc: 'Premeníme váš súbor na hotový výrobok. Veľkoformátové CNC frézovanie, 100W laser, 3D tlačová farma. Komplexné projekty vítané, série od 1 kusu. Šumperk, Česká republika.',
    social: 'Výroba na zákazku. Veľkoformátové CNC frézovanie, 100W laser, 3D tlačová farma. Od prototypu po tisícové série. Šumperk.',
    wa: 'Dobrý deň, mám otázku pre Forma Studio.'
  },
  en: {
    file: 'en.html', loc: 'en_US', url: BASE + '/en',
    title: 'Forma Studio — CNC, 3D Printing, Laser · Czech Republic',
    desc: 'We turn your file into a finished product. Large-format CNC milling, 100W laser, 3D printing farm. Complex projects welcome, batches from a single piece. Šumperk, Czech Republic.',
    social: 'Custom manufacturing in the EU. Large-format CNC milling, 100W laser, 3D printing farm. From a single prototype to thousands.',
    wa: 'Hello, I have an inquiry for Forma Studio.'
  },
  de: {
    file: 'de.html', loc: 'de_DE', url: BASE + '/de',
    title: 'Forma Studio — CNC-Fräsen, 3D-Druck, Lasergravur · Tschechien',
    desc: 'Wir verwandeln Ihre Datei in ein fertiges Produkt. Großformatiges CNC-Fräsen, 100-W-Laser, 3D-Druckfarm. Komplexe Projekte willkommen, Serien ab 1 Stück. Šumperk, Tschechien.',
    social: 'Fertigung auf Bestellung aus der EU. Großformatiges CNC-Fräsen, 100-W-Laser, 3D-Druckfarm. Vom Prototyp bis zu Tausenden.',
    wa: 'Guten Tag, ich habe eine Anfrage an Forma Studio.'
  }
};

// Matches the prefill text on any wa.me link, whatever its current value
// (index.html doubles as the cs output, so this must be idempotent across rebuilds).
const WA_RE = /(wa\.me\/4917622791055\?text=)[^"]*/g;

// Scrolling marquee items per language (regenerated each build).
const MARQUEE = {
  cs: ['CNC frézování dřeva', '3D tisk — FDM & resin', 'Laserové gravírování', 'Rapid prototyping', 'Série 1 – 10 000 ks', 'Dřevo · Plast · Kov · Akryl', '5 let v oboru', 'Šumperk, Morava'],
  sk: ['CNC frézovanie dreva', '3D tlač — FDM & resin', 'Laserové gravírovanie', 'Rapid prototyping', 'Séria 1 – 10 000 ks', 'Drevo · Plast · Kov · Akryl', '5 rokov v odbore', 'Šumperk, Morava'],
  en: ['CNC wood milling', '3D printing — FDM & resin', 'Laser engraving', 'Rapid prototyping', 'Batches 1 – 10,000 pcs', 'Wood · Plastic · Metal · Acrylic', '5 years in the field', 'Šumperk, Moravia'],
  de: ['CNC-Holzfräsen', '3D-Druck — FDM & Resin', 'Lasergravur', 'Rapid Prototyping', 'Serien 1 – 10.000 Stück', 'Holz · Kunststoff · Metall · Acryl', '5 Jahre Erfahrung', 'Šumperk, Mähren'],
};
function marqueeTrack(items) {
  const one = items.map(function (t) {
    return '    <span class="mi">' + t.replace(/&/g, '&amp;') + ' <span class="md"></span></span>';
  }).join('\n');
  return '<div class="mtrack">\n' + one + '\n' + one + '\n  </div>';
}

// Image alt text, keyed by the Czech alt in index.html. Localized for image SEO.
const ALT = {
  'CNC frézka v provozu': { sk: 'CNC frézka v prevádzke', en: 'CNC router in operation', de: 'CNC-Fräse im Betrieb' },
  'CNC frézování dřeva — velkoformátová fréza Forma Studio': { sk: 'CNC frézovanie dreva — veľkoformátová fréza Forma Studio', en: 'CNC wood milling — large-format router at Forma Studio', de: 'CNC-Holzfräsen — Großformatfräse von Forma Studio' },
  'Laserové gravírování a řezání — 100W CO2 laser Forma Studio': { sk: 'Laserové gravírovanie a rezanie — 100W CO2 laser Forma Studio', en: 'Laser engraving and cutting — 100W CO2 laser at Forma Studio', de: 'Lasergravur und -schnitt — 100-W-CO2-Laser von Forma Studio' },
  '3D tisková farma — desítky tiskáren Forma Studio Šumperk': { sk: '3D tlačová farma — desiatky tlačiarní Forma Studio Šumperk', en: '3D printing farm — dozens of printers at Forma Studio, Šumperk', de: '3D-Druckfarm — Dutzende Drucker bei Forma Studio, Šumperk' },
  'Rapid prototyping — od prototypu k sériové výrobě': { sk: 'Rapid prototyping — od prototypu k sériovej výrobe', en: 'Rapid prototyping — from prototype to series production', de: 'Rapid Prototyping — vom Prototyp zur Serienfertigung' },
  'Dřevěný produkt s brandovaným balením vyrobený CNC frézováním': { sk: 'Drevený produkt s brandovaným balením vyrobený CNC frézovaním', en: 'Wooden product with branded packaging made by CNC milling', de: 'Holzprodukt mit gebrandeter Verpackung, gefertigt per CNC-Fräsen' },
  'Dřevěná bezdrátová nabíječka vyrobená CNC frézováním': { sk: 'Drevená bezdrôtová nabíjačka vyrobená CNC frézovaním', en: 'Wooden wireless charger made by CNC milling', de: 'Kabelloses Ladegerät aus Holz, gefertigt per CNC-Fräsen' },
  'Dřevěný aroma difuzér z dubového dřeva — CNC výroba': { sk: 'Drevený aroma difuzér z dubového dreva — CNC výroba', en: 'Oak wood aroma diffuser — CNC manufacturing', de: 'Aroma-Diffuser aus Eichenholz — CNC-Fertigung' },
  'Bezdrátová nabíječka s laser gravírovaným logem Cloudflare': { sk: 'Bezdrôtová nabíjačka s laserovo gravírovaným logom Cloudflare', en: 'Wireless charger with a laser-engraved Cloudflare logo', de: 'Kabelloses Ladegerät mit lasergraviertem Cloudflare-Logo' },
  'Dřevěný stojánek z dubu vyrobený CNC frézováním': { sk: 'Drevený stojanček z dubu vyrobený CNC frézovaním', en: 'Oak wood stand made by CNC milling', de: 'Ständer aus Eichenholz, gefertigt per CNC-Fräsen' },
  'Dřevěná bezdrátová nabíječka s iPhonem — ukázka produktu': { sk: 'Drevená bezdrôtová nabíjačka s iPhonom — ukážka produktu', en: 'Wooden wireless charger with an iPhone — product showcase', de: 'Kabelloses Ladegerät aus Holz mit iPhone — Produktbeispiel' },
  'Sada dřevěných doplňků — CNC frézování a laserové gravírování': { sk: 'Sada drevených doplnkov — CNC frézovanie a laserové gravírovanie', en: 'Set of wooden accessories — CNC milling and laser engraving', de: 'Set aus Holzaccessoires — CNC-Fräsen und Lasergravur' },
  'Aroma difuzér z ořechového dřeva — CNC výroba na zakázku': { sk: 'Aroma difuzér z orechového dreva — CNC výroba na zákazku', en: 'Walnut wood aroma diffuser — custom CNC manufacturing', de: 'Aroma-Diffuser aus Nussholz — CNC-Auftragsfertigung' },
  'Dřevěný stojánek z ořechu — zakázková CNC výroba': { sk: 'Drevený stojanček z orecha — zákazková CNC výroba', en: 'Walnut wood stand — custom CNC manufacturing', de: 'Ständer aus Nussholz — CNC-Auftragsfertigung' },
  'Dřevěná pokladnička s laser gravírovaným logem pro Cloudflare event': { sk: 'Drevená pokladnička s laserovo gravírovaným logom pre Cloudflare event', en: 'Wooden money box with a laser-engraved logo for a Cloudflare event', de: 'Spardose aus Holz mit lasergraviertem Logo für ein Cloudflare-Event' },
  'Velký aroma difuzér z ořechového dřeva — sériová výroba': { sk: 'Veľký aroma difuzér z orechového dreva — sériová výroba', en: 'Large walnut wood aroma diffuser — series production', de: 'Großer Aroma-Diffuser aus Nussholz — Serienfertigung' },
  'Unboxing dřevěného aroma difuzéru — balení a prezentace produktu': { sk: 'Unboxing dreveného aroma difuzéra — balenie a prezentácia produktu', en: 'Unboxing a wooden aroma diffuser — packaging and presentation', de: 'Unboxing eines Aroma-Diffusers aus Holz — Verpackung und Präsentation' },
  'Detail zadní strany dřevěného produktu — kvalita CNC opracování': { sk: 'Detail zadnej strany dreveného produktu — kvalita CNC opracovania', en: 'Close-up of the back of a wooden product — CNC finishing quality', de: 'Detail der Rückseite eines Holzprodukts — Qualität der CNC-Bearbeitung' },
  'Detail povrchové úpravy dřevěného výrobku z Forma Studia': { sk: 'Detail povrchovej úpravy dreveného výrobku z Forma Studia', en: 'Close-up of the surface finish of a wooden product by Forma Studio', de: 'Detail der Oberflächenbearbeitung eines Holzprodukts von Forma Studio' },
  'Dřevěný výrobek na zakázku — CNC frézování Šumperk': { sk: 'Drevený výrobok na zákazku — CNC frézovanie Šumperk', en: 'Custom wooden product — CNC milling, Šumperk', de: 'Holzprodukt nach Maß — CNC-Fräsen, Šumperk' },
  'Detail řemeslného zpracování — CNC a laserová výroba': { sk: 'Detail remeselného spracovania — CNC a laserová výroba', en: 'Close-up of craftsmanship — CNC and laser manufacturing', de: 'Detail der handwerklichen Verarbeitung — CNC- und Laserfertigung' },
  'Pohled do dílny Forma Studia — CNC stroje v provozu': { sk: 'Pohľad do dielne Forma Studia — CNC stroje v prevádzke', en: 'Inside the Forma Studio workshop — CNC machines in operation', de: 'Blick in die Werkstatt von Forma Studio — CNC-Maschinen im Betrieb' },
  'Výrobní prostory Forma Studia v Šumperku': { sk: 'Výrobné priestory Forma Studia v Šumperku', en: 'Forma Studio production facilities in Šumperk', de: 'Produktionsräume von Forma Studio in Šumperk' },
  'Tým Forma Studia v dílně — CNC a 3D tisk Šumperk': { sk: 'Tím Forma Studia v dielni — CNC a 3D tlač Šumperk', en: 'The Forma Studio team in the workshop — CNC and 3D printing, Šumperk', de: 'Das Forma-Studio-Team in der Werkstatt — CNC und 3D-Druck, Šumperk' },
  'Dodávka zakázky — spolehlivý výrobní partner Forma Studio': { sk: 'Dodávka zákazky — spoľahlivý výrobný partner Forma Studio', en: 'Order delivery — Forma Studio, a reliable manufacturing partner', de: 'Auftragslieferung — Forma Studio, zuverlässiger Fertigungspartner' },
  'Tým Forma Studia — výrobní dílna CNC a laser Šumperk': { sk: 'Tím Forma Studia — výrobná dielňa CNC a laser Šumperk', en: 'The Forma Studio team — CNC and laser workshop, Šumperk', de: 'Das Forma-Studio-Team — CNC- und Laserwerkstatt, Šumperk' },
};

const SRC = fs.readFileSync('index.html', 'utf8');

function ogBlock(primaryLoc) {
  const lines = ['<meta property="og:locale" content="' + primaryLoc + '">'];
  ALL.forEach(function (p) {
    if (p[1] !== primaryLoc) lines.push('<meta property="og:locale:alternate" content="' + p[1] + '">');
  });
  return lines.join('\n');
}

// ── FAQ structured data (rich results in Google) ──
function decodeText(s) {
  return s.replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}
function pickLang(group, lang) {
  const re = new RegExp('<span data-lang="' + lang + '"[^>]*>([\\s\\S]*?)<\\/span>');
  const mm = group.match(re);
  return mm ? decodeText(mm[1]) : '';
}
function extractFaq(src, lang) {
  const questions = [], answers = [];
  let m;
  const qRe = /<button class="fq"[^>]*>([\s\S]*?)<svg/g;
  while ((m = qRe.exec(src))) questions.push(m[1]);
  const aRe = /<div class="fa"><p>([\s\S]*?)<\/p>/g;
  while ((m = aRe.exec(src))) answers.push(m[1]);
  const out = [];
  const n = Math.min(questions.length, answers.length);
  for (let i = 0; i < n; i++) {
    const q = pickLang(questions[i], lang), a = pickLang(answers[i], lang);
    if (q && a) out.push({ q, a });
  }
  return out;
}
function faqSchema(pairs) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map(function (p) {
      return { '@type': 'Question', name: p.q, acceptedAnswer: { '@type': 'Answer', text: p.a } };
    })
  });
}

Object.keys(META).forEach(function (lang) {
  const m = META[lang];
  let h = SRC;

  h = h.replace('<html lang="cs">', '<html lang="' + lang + '">');
  h = h.replace('<link rel="canonical" href="https://formastudio.cz/">', '<link rel="canonical" href="' + m.url + '">');
  h = h.replace(/<title>[\s\S]*?<\/title>/, '<title>' + m.title + '</title>');
  h = h.replace(/<meta name="description" content="[\s\S]*?">/, '<meta name="description" content="' + m.desc + '">');
  // Social-share cards (WhatsApp / Facebook / LinkedIn / X) read these — localize them
  h = h.replace(/<meta property="og:title" content="[\s\S]*?">/, '<meta property="og:title" content="' + m.title + '">');
  h = h.replace(/<meta property="og:description" content="[\s\S]*?">/, '<meta property="og:description" content="' + m.social + '">');
  h = h.replace('<meta property="og:url" content="https://formastudio.cz/">', '<meta property="og:url" content="' + m.url + '">');
  h = h.replace(/<meta name="twitter:title" content="[\s\S]*?">/, '<meta name="twitter:title" content="' + m.title + '">');
  h = h.replace(/<meta name="twitter:description" content="[\s\S]*?">/, '<meta name="twitter:description" content="' + m.social + '">');
  // Localized social-share image (og:image + twitter:image both point at og-cs.jpg in the source)
  h = h.split('/images/og-cs.jpg').join('/images/og-' + lang + '.jpg');
  h = h.replace(/<meta property="og:image:alt" content="[\s\S]*?">/, '<meta property="og:image:alt" content="' + m.title + '">');
  h = h.replace(/<meta property="og:locale"[\s\S]*?<meta property="og:locale:alternate" content="de_DE">/, ogBlock(m.loc));

  // Localize the WhatsApp click-to-chat prefill text on every wa.me link
  h = h.replace(WA_RE, '$1' + encodeURIComponent(m.wa));

  // Localize the scrolling marquee
  h = h.replace(/<div class="mtrack">[\s\S]*?<\/div>/, marqueeTrack(MARQUEE[lang]));

  // Localize image alt text (cs keeps the originals)
  if (lang !== 'cs') {
    Object.keys(ALT).forEach(function (cs) {
      h = h.split('alt="' + cs + '"').join('alt="' + ALT[cs][lang] + '"');
    });
  }

  // FAQ rich-results structured data — strip any previously generated block, re-inject for this language
  h = h.replace(/\s*<script type="application\/ld\+json" data-faq>[\s\S]*?<\/script>/, '');
  const faq = extractFaq(SRC, lang);
  if (faq.length) {
    h = h.replace('</head>', '<script type="application/ld+json" data-faq>' + faqSchema(faq) + '</script>\n</head>');
  }

  // Activate this language's spans, deactivate the rest (attribute-order tolerant)
  h = h.replace(/<span\b([^>]*?)\bdata-lang="(cs|sk|en|de)"([^>]*?)>/g, function (_m, pre, l, post) {
    let attrs = (pre + post).replace(/\s*class="on"/, '').replace(/\s+/g, ' ').trim();
    const on = (l === lang) ? ' class="on"' : '';
    return '<span data-lang="' + l + '"' + (attrs ? ' ' + attrs : '') + on + '>';
  });

  // Highlight the active language in the switcher
  h = h.replace('<a class="lbtn on" data-l="cs"', '<a class="lbtn" data-l="cs"');
  h = h.replace('<a class="lbtn" data-l="' + lang + '"', '<a class="lbtn on" data-l="' + lang + '"');

  fs.writeFileSync(m.file, h, 'utf8');
  console.log('wrote ' + m.file + '  (lang=' + lang + ')');
});

// ── sitemap.xml (regenerated with current lastmod) ──
(function () {
  const today = new Date().toISOString().slice(0, 10);
  const alts = ALL.map(function (p) {
    return '    <xhtml:link rel="alternate" hreflang="' + p[0] + '" href="' + META[p[0]].url + '"/>';
  }).join('\n') + '\n    <xhtml:link rel="alternate" hreflang="x-default" href="' + BASE + '/"/>';
  const urls = ['cs', 'de', 'en', 'sk'].map(function (l) {
    return '  <url>\n    <loc>' + META[l].url + '</loc>\n    <lastmod>' + today + '</lastmod>\n' + alts + '\n  </url>';
  }).join('\n');
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + urls + '\n</urlset>\n';
  fs.writeFileSync('sitemap.xml', xml, 'utf8');
  console.log('wrote sitemap.xml  (lastmod ' + today + ')');
})();
