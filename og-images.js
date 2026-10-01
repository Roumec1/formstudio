/*
 * Regenerates the 1200x630 share cards images/og-<lang>.jpg in the site's design.
 * The card layout lives in og-card.html (real fonts + photo), rendered by headless Chrome.
 * Run: start a local server on :3001 (e.g. `npx serve -l 3001 .`), then `node og-images.js`  (needs sharp)
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const sharp = require('sharp');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://localhost:3001';

(async () => {
  for (const lang of ['cs', 'sk', 'en', 'de']) {
    const raw = 'images/og-raw-' + lang + '.png';
    // note: use the clean URL — the dev server redirects *.html and drops the query string
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=4000',
      '--window-size=1200,630', '--screenshot=' + raw, BASE + '/og-card?lang=' + lang], { stdio: 'ignore' });
    const info = await sharp(raw).jpeg({ quality: 86, mozjpeg: true }).toFile('images/og-' + lang + '.jpg');
    fs.unlinkSync(raw);
    console.log('  images/og-' + lang + '.jpg  (' + Math.round(info.size / 1024) + ' KB)');
  }
})();
