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
    social: 'Výroba na zakázku. Velkoformátové CNC frézování, 100W laser, 3D tisková farma. Od prototypu po tisícové série. Šumperk.'
  },
  sk: {
    file: 'sk.html', loc: 'sk_SK', url: BASE + '/sk',
    title: 'Forma Studio — CNC, 3D tlač, Laser · Šumperk',
    desc: 'Premeníme váš súbor na hotový výrobok. Veľkoformátové CNC frézovanie, 100W laser, 3D tlačová farma. Komplexné projekty vítané, série od 1 kusu. Šumperk, Česká republika.',
    social: 'Výroba na zákazku. Veľkoformátové CNC frézovanie, 100W laser, 3D tlačová farma. Od prototypu po tisícové série. Šumperk.'
  },
  en: {
    file: 'en.html', loc: 'en_US', url: BASE + '/en',
    title: 'Forma Studio — CNC, 3D Printing, Laser · Czech Republic',
    desc: 'We turn your file into a finished product. Large-format CNC milling, 100W laser, 3D printing farm. Complex projects welcome, batches from a single piece. Šumperk, Czech Republic.',
    social: 'Custom manufacturing in the EU. Large-format CNC milling, 100W laser, 3D printing farm. From a single prototype to thousands.'
  },
  de: {
    file: 'de.html', loc: 'de_DE', url: BASE + '/de',
    title: 'Forma Studio — CNC-Fräsen, 3D-Druck, Lasergravur · Tschechien',
    desc: 'Wir verwandeln Ihre Datei in ein fertiges Produkt. Großformatiges CNC-Fräsen, 100-W-Laser, 3D-Druckfarm. Komplexe Projekte willkommen, Serien ab 1 Stück. Šumperk, Tschechien.',
    social: 'Fertigung auf Bestellung aus der EU. Großformatiges CNC-Fräsen, 100-W-Laser, 3D-Druckfarm. Vom Prototyp bis zu Tausenden.'
  }
};

const SRC = fs.readFileSync('index.html', 'utf8');

function ogBlock(primaryLoc) {
  const lines = ['<meta property="og:locale" content="' + primaryLoc + '">'];
  ALL.forEach(function (p) {
    if (p[1] !== primaryLoc) lines.push('<meta property="og:locale:alternate" content="' + p[1] + '">');
  });
  return lines.join('\n');
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
  h = h.replace(/<meta property="og:locale"[\s\S]*?<meta property="og:locale:alternate" content="de_DE">/, ogBlock(m.loc));

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
