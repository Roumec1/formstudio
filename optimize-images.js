/*
 * One-off: resize + recompress the images actually referenced by the site.
 * Gallery JPEGs were 1–7 MB each (~62 MB total) — this brings them to web sizes.
 * Originals are recoverable from git. Run: node optimize-images.js
 * Requires sharp (installed transiently: npm i --no-save sharp).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// [file, maxLongEdge, quality]
const JOBS = [
  // Gallery — shown in grid + opened full-screen in the lightbox
  ...Array.from({ length: 18 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return ['gallery/g' + n + '.jpg', 1600, 80];
  }),
  // Hero (full-width banner)
  ['images/cnc-frzka-v-provozu.jpg', 1920, 82],
  // Service cards (display ~420px tall)
  ['images/cnc-frzovani-dreva.jpg', 1280, 82],
  ['images/laserov-gravirovani.jpg', 1280, 82],
  ['images/rapid-prototyping.jpg', 1280, 82],
  // About / comparison / delivery
  ['images/image-8.jpg', 1400, 82],
  ['images/image-9.jpg', 1400, 82],
];

// Special: 3d-tisk.png is a photo mislabeled as PNG → re-encode to JPEG.
const PNG_TO_JPG = { src: 'images/3d-tisk.png', dst: 'images/3d-tisk.jpg', max: 1280, q: 82 };

function kb(n) { return (n / 1024).toFixed(0) + ' KB'; }

(async () => {
  let before = 0, after = 0;

  for (const [file, max, q] of JOBS) {
    if (!fs.existsSync(file)) { console.log('  SKIP (missing): ' + file); continue; }
    const src = fs.readFileSync(file);
    const orig = src.length;
    const buf = await sharp(src)
      .rotate() // honor EXIF orientation
      .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer();
    fs.writeFileSync(file, buf);
    before += orig; after += buf.length;
    console.log('  ' + file.padEnd(34) + kb(orig).padStart(9) + ' -> ' + kb(buf.length).padStart(9));
  }

  // PNG -> JPG
  if (fs.existsSync(PNG_TO_JPG.src)) {
    const pngSrc = fs.readFileSync(PNG_TO_JPG.src);
    const orig = pngSrc.length;
    const buf = await sharp(pngSrc)
      .rotate()
      .resize({ width: PNG_TO_JPG.max, height: PNG_TO_JPG.max, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: PNG_TO_JPG.q, mozjpeg: true })
      .toBuffer();
    fs.writeFileSync(PNG_TO_JPG.dst, buf);
    fs.unlinkSync(PNG_TO_JPG.src);
    before += orig; after += buf.length;
    console.log('  ' + (PNG_TO_JPG.src + ' -> .jpg').padEnd(34) + kb(orig).padStart(9) + ' -> ' + kb(buf.length).padStart(9));
  }

  console.log('\n  TOTAL  ' + kb(before) + '  ->  ' + kb(after) +
    '   (' + (100 - (after / before) * 100).toFixed(1) + '% smaller)');
})();
