/*
 * One-off: create phone-sized copies (<name>-sm.jpg, 640px wide) of the site's photos and add
 * srcset/sizes + intrinsic width/height to every <img> that uses them, so phones stop downloading
 * 1600px photos (and layout space is reserved). Safe to re-run. Needs sharp.
 * Run: node responsive-images.js && node build.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PAGES = ['index.html', 'lohnfertigung.html', 'werbegeschenke.html'];
const SM_WIDTH = 640;

// Where each image sits decides how wide it renders — pick sizes by the <img>'s class/context.
function sizesFor(tag) {
  if (/fetchpriority="high"/.test(tag)) return '(max-width:980px) 92vw, 480px';        // hero sheet
  if (/\bloading="lazy"/.test(tag) && /gallery\/g\d+\.jpg/.test(tag) && !/class="(svc-img|about-img|comp-img)"/.test(tag))
    return '(max-width:600px) 100vw, (max-width:980px) 50vw, 33vw';                       // gallery / product grids
  return '(max-width:980px) 100vw, 50vw';                                                // section photos
}

(async () => {
  const meta = {};
  const targets = new Set();
  for (const p of PAGES) {
    const html = fs.readFileSync(p, 'utf8');
    for (const m of html.matchAll(/<img\b[^>]*\bsrc="\/?((?:gallery|images)\/[^"]+\.jpg)"/g)) targets.add(m[1]);
  }

  for (const rel of targets) {
    if (rel.endsWith('-sm.jpg') || !fs.existsSync(rel)) continue;
    const src = fs.readFileSync(rel);
    const m = await sharp(src).metadata();
    meta[rel] = { w: m.width, h: m.height };
    const smPath = rel.replace(/\.jpg$/, '-sm.jpg');
    if (m.width > SM_WIDTH) {
      const buf = await sharp(src).rotate().resize({ width: SM_WIDTH, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
      fs.writeFileSync(smPath, buf);
      meta[rel].sm = true;
      console.log('  ' + smPath.padEnd(38) + (src.length / 1024).toFixed(0).padStart(5) + ' KB -> ' + (buf.length / 1024).toFixed(0).padStart(4) + ' KB');
    }
  }

  for (const p of PAGES) {
    let html = fs.readFileSync(p, 'utf8');
    let n = 0;
    html = html.replace(/<img\b[^>]*>/g, (tag) => {
      const m = tag.match(/\bsrc="(\/?)((?:gallery|images)\/[^"]+\.jpg)"/);
      if (!m || !meta[m[2]]) return tag;
      const [, lead, rel] = m;
      const { w, h, sm } = meta[rel];
      let t = tag.replace(/\s(srcset|sizes)="[^"]*"/g, '');
      if (!/\bwidth="/.test(t)) t = t.replace(/<img\b/, `<img width="${w}" height="${h}"`);
      if (sm) {
        const u = lead + rel;
        t = t.replace(/<img\b/, `<img srcset="${u.replace(/\.jpg$/, '-sm.jpg')} ${SM_WIDTH}w, ${u} ${w}w" sizes="${sizesFor(tag)}"`);
      }
      if (t !== tag) n++;
      return t;
    });

    // Hero preload must advertise the same candidates, or the browser downloads the image twice.
    html = html.replace(/<link rel="preload" as="image" href="(\/(?:gallery|images)\/[^"]+\.jpg)"[^>]*>/, (tag, href) => {
      const rel = href.slice(1);
      if (!meta[rel] || !meta[rel].sm) return tag;
      return `<link rel="preload" as="image" href="${href}" imagesrcset="${href.replace(/\.jpg$/, '-sm.jpg')} ${SM_WIDTH}w, ${href} ${meta[rel].w}w" imagesizes="(max-width:980px) 92vw, 480px" fetchpriority="high">`;
    });

    fs.writeFileSync(p, html);
    console.log(p + ': ' + n + ' <img> updated');
  }
})();
