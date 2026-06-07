/*
 * One-off: generate branded 1200x630 Open Graph share images per language
 * into images/og-<lang>.jpg. Run: node og-images.js  (needs sharp)
 * These are what WhatsApp / Facebook / LinkedIn / X show as the preview card.
 */
const fs = require('fs');
const sharp = require('sharp');

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Arial, 'Helvetica Neue', Helvetica, sans-serif";

const L = {
  cs: { h1: 'Proměníme váš soubor', h2: 'v hotový výrobek.', sub: 'CNC frézování · 3D tisk · Laser — od 1 kusu', foot: 'Šumperk · EU' },
  sk: { h1: 'Premeníme váš súbor', h2: 'na hotový výrobok.', sub: 'CNC frézovanie · 3D tlač · Laser — od 1 kusu', foot: 'Šumperk · EU' },
  en: { h1: 'We turn your file', h2: 'into a finished product.', sub: 'CNC milling · 3D printing · Laser — from 1 piece', foot: 'Šumperk, Czechia · EU' },
  de: { h1: 'Ihre Datei wird', h2: 'zum fertigen Teil.', sub: 'CNC-Fräsen · 3D-Druck · Laser — ab 1 Stück', foot: 'Šumperk, Tschechien · EU' },
};

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function svg(t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="100%" cy="100%" r="80%">
      <stop offset="0%" stop-color="#c94e1e" stop-opacity="0.28"/>
      <stop offset="55%" stop-color="#c94e1e" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#111110"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="10" height="630" fill="#c94e1e"/>

  <text x="70" y="110" font-family="${SERIF}" font-size="46" fill="#ffffff">Forma<tspan fill="#c94e1e">.</tspan></text>
  <text x="70" y="140" font-family="${SANS}" font-size="18" letter-spacing="6" fill="#9a978f">STUDIO</text>

  <text x="70" y="320" font-family="${SERIF}" font-size="74" fill="#ffffff">${esc(t.h1)}</text>
  <text x="70" y="408" font-family="${SERIF}" font-size="74" font-style="italic" fill="#e8824f">${esc(t.h2)}</text>
  <rect x="74" y="450" width="120" height="4" fill="#c94e1e"/>

  <text x="70" y="510" font-family="${SANS}" font-size="30" fill="#cfccc4">${esc(t.sub)}</text>

  <text x="70" y="580" font-family="${SANS}" font-size="28" font-weight="bold" fill="#ffffff">formastudio.cz</text>
  <text x="1130" y="580" text-anchor="end" font-family="${SANS}" font-size="24" fill="#8f8c84">${esc(t.foot)}</text>
</svg>`;
}

(async () => {
  for (const lang of Object.keys(L)) {
    const buf = await sharp(Buffer.from(svg(L[lang]))).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    fs.writeFileSync('images/og-' + lang + '.jpg', buf);
    console.log('  images/og-' + lang + '.jpg  (' + (buf.length / 1024).toFixed(0) + ' KB)');
  }
  console.log('Done.');
})();
