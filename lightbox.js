/* Lightbox for the German landing pages — same look and controls as the homepage gallery:
   click a photo to enlarge, browse with arrows, keyboard and swipe. Which photos: data-sel on the script tag. */
(function () {
  var me = document.currentScript;
  var items = Array.prototype.slice.call(document.querySelectorAll(me && me.dataset.sel || '.work-grid img'));
  if (!items.length) return;

  var css = '.lb-overlay{position:fixed;inset:0;z-index:9999;background:rgba(250,249,247,.35);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:none;align-items:center;justify-content:center;cursor:zoom-out;opacity:0;transition:opacity .35s ease}' +
    '.lb-overlay.active{display:flex;opacity:1}' +
    '.lb-overlay img{max-width:88vw;max-height:80vh;object-fit:contain;border-radius:8px;box-shadow:0 12px 80px rgba(0,0,0,.18),0 2px 16px rgba(0,0,0,.08);transform:scale(.95);transition:transform .35s cubic-bezier(.25,.1,.25,1);cursor:pointer}' +
    '.lb-overlay.active img{transform:scale(1)}' +
    '.lb-close{position:fixed;top:1.2rem;right:1.5rem;color:var(--mid,#6e665a);font-size:1.8rem;cursor:pointer;z-index:10000;background:rgba(255,255,255,.6);border:1px solid var(--border,#e2dccd);border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-family:inherit}' +
    '.lb-close:hover{color:var(--ink,#221b12);background:rgba(255,255,255,.9)}' +
    '.lb-fig{margin:0;display:flex;flex-direction:column;align-items:center;gap:.7rem}' +
    '.lb-cap{font-size:.78rem;color:var(--ink,#221b12);background:rgba(255,255,255,.85);border:1px solid var(--border,#e2dccd);border-radius:20px;padding:.35rem .8rem;max-width:88vw;display:flex;gap:.8rem;align-items:center}' +
    '.lb-count{color:var(--vio,var(--accent,#6f4f82));white-space:nowrap;font-weight:700}' +
    '.lb-alt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.lb-nav{position:fixed;top:50%;transform:translateY(-50%);z-index:10000;width:52px;height:52px;border-radius:50%;border:1px solid var(--border,#e2dccd);background:rgba(255,255,255,.85);color:var(--ink,#221b12);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.12);transition:background .2s,color .2s}' +
    '.lb-nav:hover{background:var(--ink,#221b12);color:#fff}.lb-nav svg{width:24px;height:24px}.lb-prev{left:1.2rem}.lb-next{right:1.2rem}' +
    '@media(max-width:600px){.lb-nav{width:44px;height:44px;top:auto;bottom:1.2rem;transform:none}.lb-prev{left:calc(50% - 56px)}.lb-next{right:calc(50% - 56px)}.lb-overlay img{max-height:70vh}.lb-alt{display:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var T = { cs: ['zvětšit', 'Předchozí', 'Další', 'Zavřít'], sk: ['zväčšiť', 'Predchádzajúca', 'Ďalšia', 'Zavrieť'], en: ['enlarge', 'Previous', 'Next', 'Close'], de: ['vergrößern', 'Zurück', 'Weiter', 'Schließen'] };
  var L = T[document.documentElement.lang] || T.de;
  var arrow = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; };
  var ov = document.createElement('div');
  ov.className = 'lb-overlay'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  ov.innerHTML = '<button class="lb-close" aria-label="' + L[3] + '">&times;</button>' +
    '<button class="lb-nav lb-prev" aria-label="' + L[1] + '">' + arrow('M15 5l-7 7 7 7') + '</button>' +
    '<figure class="lb-fig"><img src="" alt=""><figcaption class="lb-cap"><span class="lb-count"></span><span class="lb-alt"></span></figcaption></figure>' +
    '<button class="lb-nav lb-next" aria-label="' + L[2] + '">' + arrow('M9 5l7 7-7 7') + '</button>';
  document.body.appendChild(ov);
  var big = ov.querySelector('img'), btnClose = ov.querySelector('.lb-close'), cnt = ov.querySelector('.lb-count'), alt = ov.querySelector('.lb-alt');
  var idx = 0, opener = null;

  // the largest candidate from srcset, so the enlarged photo is sharp
  function largest(im) {
    var best = im.getAttribute('src'), bw = 0;
    (im.getAttribute('srcset') || '').split(',').forEach(function (c) {
      var p = c.trim().split(/\s+/), w = parseInt(p[1], 10) || 0;
      if (p[0] && w > bw) { bw = w; best = p[0]; }
    });
    return best;
  }
  function show(i) {
    idx = (i + items.length) % items.length;
    var im = items[idx];
    big.src = largest(im); big.alt = im.alt || '';
    cnt.textContent = (idx + 1) + ' / ' + items.length; alt.textContent = im.alt || '';
    [idx + 1, idx - 1].forEach(function (j) { var n = items[(j + items.length) % items.length]; if (n) (new Image()).src = largest(n); });
  }
  function open(i) { opener = items[i]; show(i); ov.classList.add('active'); document.body.style.overflow = 'hidden'; btnClose.focus(); }
  function close() {
    if (!ov.classList.contains('active')) return;
    ov.classList.remove('active'); document.body.style.overflow = '';
    if (opener) { opener.focus(); opener = null; }
  }
  items.forEach(function (im, i) {
    im.style.cursor = 'zoom-in'; im.setAttribute('tabindex', '0'); im.setAttribute('role', 'button');
    im.setAttribute('aria-label', (im.alt || 'Bild') + ' — ' + L[0]);
    im.addEventListener('click', function () { open(i); });
    im.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
  });
  ov.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); show(idx - 1); });
  ov.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); show(idx + 1); });
  big.addEventListener('click', function (e) { e.stopPropagation(); show(idx + 1); }); // tap photo = next
  ov.addEventListener('click', close);
  btnClose.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (!ov.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
  });
  var x0 = null, y0 = null;
  ov.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  ov.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(idx + (dx < 0 ? 1 : -1));
  });
})();
