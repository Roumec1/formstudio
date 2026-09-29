/*
 * One-off: create smaller copies (<name>-800.jpg, <name>-1200.jpg) of the site's photos and add
 * srcset/sizes + intrinsic width/height to every <img> that uses them, so phones stop downloading
 * 1600px photos (and layout space is reserved). Safe to re-run. Needs sharp.
 * Run: node responsive-images.js && node build.js
 */
const fs = require('fs');
const sharp = require('sharp');

const PAGES = ['index.html', 'lohnfertigung.html', 'werbegeschenke.html'];
const STEPS = [800, 1200]; // phone (~1.75–2x DPR) and tablet / 3x-phone widths

// Where each image sits decides how wide it renders — pick sizes by the <img>'s context.
function sizesFor(tag) {
  if (/fetchpriority="high"/.test(tag)) return '(max-width:980px) 92vw, 480px';           // hero sheet
  if (/gallery\/g\d+\.jpg/.test(tag) && !/class="(svc-img|about-img|comp-img)"/.test(tag))
    return '(max-width:600px) 100vw, (max-width:980px) 50vw, 33vw';                          // gallery / product grids
  return '(max-width:980px) 100vw, 50vw';                                                   // section photos
}

(async () => {
  const meta = {};
  const targets = new Set();
  for (const p of PAGES) {
    const html = fs.readFileSync(p, 'utf8');
    for (const m of html.matchAll(/<img\b[^>]*\bsrc="\/?((?:gallery|images)\/[^"]+\.jpg)"/g)) targets.add(m[1]);
  }

  for (const rel of targets) {
    const generated = new RegExp('-(sm|' + STEPS.join('|') + ')\\.jpg$'); // our own copies, not e.g. image-8.jpg
    if (generated.test(rel) || !fs.existsSync(rel)) continue;
    const src = fs.readFileSync(rel);
    const m = await sharp(src).metadata();
    meta[rel] = { w: m.width, h: m.height, steps: [] };
    for (const w of STEPS) {
      if (m.width <= w * 1.15) continue; // not worth a copy this close to the original size
      const out = rel.replace(/\.jpg$/, '-' + w + '.jpg');
      const buf = await sharp(src).rotate().resize({ width: w }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
      fs.writeFileSync(out, buf);
      meta[rel].steps.push(w);
      console.log('  ' + out.padEnd(40) + (src.length / 1024).toFixed(0).padStart(5) + ' KB -> ' + (buf.length / 1024).toFixed(0).padStart(4) + ' KB');
    }
  }

  const srcsetFor = (url, rel) =>
    meta[rel].steps.map((s) => url.replace(/\.jpg$/, '-' + s + '.jpg') + ' ' + s + 'w')
      .concat(url + ' ' + meta[rel].w + 'w').join(', ');

  for (const p of PAGES) {
    let html = fs.readFileSync(p, 'utf8');
    let n = 0;
    html = html.replace(/<img\b[^>]*>/g, (tag) => {
      const m = tag.match(/\bsrc="(\/?)((?:gallery|images)\/[^"]+\.jpg)"/);
      if (!m || !meta[m[2]]) return tag;
      const [, lead, rel] = m;
      let t = tag.replace(/\s(srcset|sizes)="[^"]*"/g, '');
      if (!/\bwidth="/.test(t)) t = t.replace(/<img\b/, `<img width="${meta[rel].w}" height="${meta[rel].h}"`);
      if (meta[rel].steps.length) t = t.replace(/<img\b/, `<img srcset="${srcsetFor(lead + rel, rel)}" sizes="${sizesFor(tag)}"`);
      if (t !== tag) n++;
      return t;
    });

    // Hero preload must advertise the same candidates, or the browser downloads the image twice.
    html = html.replace(/<link rel="preload" as="image" href="(\/(?:gallery|images)\/[^"]+\.jpg)"[^>]*>/, (tag, href) => {
      const rel = href.slice(1);
      if (!meta[rel] || !meta[rel].steps.length) return tag;
      return `<link rel="preload" as="image" href="${href}" imagesrcset="${srcsetFor(href, rel)}" imagesizes="(max-width:980px) 92vw, 480px" fetchpriority="high">`;
    });

    fs.writeFileSync(p, html);
    console.log(p + ': ' + n + ' <img> updated');
  }
})();
