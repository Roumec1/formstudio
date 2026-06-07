# Forma Studio — website

Static, multilingual marketing site for **Forma Studio** (brand of *Wearetreed s.r.o.*) —
custom manufacturing: CNC milling, laser engraving/cutting, 3D printing.
Hosted on **Vercel**, auto-deploys on push to `main`.

## ⚠️ The one rule

**Edit `index.html` only, then run `node build.js`.**
`index.html` is the Czech source *and* the build's single source of truth.
`de.html`, `en.html`, `sk.html` and `sitemap.xml` are **generated** — never edit them by hand
(they're overwritten on every build).

```bash
node build.js          # regenerates de/en/sk.html + sitemap.xml from index.html
```

## How the site is built

- **Languages:** `cs` (default, served at `/`), `sk` (`/sk`), `en` (`/en`), `de` (`/de`).
  Each is its own pre-rendered, crawlable page (good for SEO). `vercel.json` `cleanUrls`
  maps `/de` → `de.html`.
- **In-page markup pattern:** `<span data-lang="cs" class="on">…</span><span data-lang="de">…</span>` —
  CSS shows only `.on`. `build.js` flips which language is `.on` per output file; the inline
  `setL()` keeps it in sync at runtime.
- **`build.js` localizes per page:** `<html lang>`, title, meta description, canonical,
  `og:*` / `twitter:*` (incl. per-language `og:image` → `images/og-<lang>.jpg`), `og:locale`,
  the WhatsApp prefill text, the hero **marquee**, all image **alt** text, and the **FAQPage**
  JSON-LD (`data-faq`). All replacements are idempotent across rebuilds.

## One-off generator scripts

These regenerate committed assets; run only when the inputs change. They need `sharp`
(`npm i --no-save sharp`; `node_modules` / `package*.json` are gitignored).

| Script | Purpose | Output |
|---|---|---|
| `fetch-fonts.js` | Download + self-host Google Fonts (Inter, Instrument Serif; latin + latin-ext) | `fonts/` |
| `optimize-images.js` | Resize/recompress referenced photos (mozjpeg) | `gallery/`, `images/` |
| `og-images.js` | Render branded 1200×630 social-share cards per language | `images/og-<lang>.jpg` |

## Geo-routing & forms

- **`middleware.js`** (Vercel Edge Middleware) runs only on `/` and redirects first-time
  visitors by country (CZ→cs, SK→sk, DE/AT/CH/LI→de, else→en). Bots are exempt; manual choice
  is remembered in the `floc` cookie. Only runs on Vercel, not local preview.
- **Contact form** → `api/contact.js` (Resend email). Honeypot (`company`) + origin allowlist
  + input caps. Floating mini-form + WhatsApp FAB share the flow.

## Local preview

```bash
npx serve .            # static preview (note: middleware + /api only run on Vercel)
```

## Deploy

Push to `main` → Vercel builds & deploys automatically. No manual `vercel deploy` needed.

## Manual setup (one-time, in dashboards)

- **Resend:** verify the domain and send the form `from:` as e.g. `web@formastudio.cz`
  (currently the sandbox `onboarding@resend.dev` → hurts deliverability).
- **Vercel:** enable **Web Analytics** (events `lead_form`, `lead_form_floating`,
  `whatsapp_click` are already wired).

## Legal entity

Brand **Forma Studio** is operated by **Wearetreed s.r.o.** — IČO 27837793, DIČ CZ27837793,
seat Za školou 783, 789 61 Bludov; workshop Uničovská 296/46, Šumperk;
Krajský soud v Ostravě, file C 43206; jednatel Ing. Roman Unzeitig.
Used in `/impressum` and `/datenschutz`.
