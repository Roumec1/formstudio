// Only our own site may submit the form. Vercel preview deploys (*.vercel.app)
// are allowed so staging works; everything else is rejected.
const ALLOWED = [/^https:\/\/([a-z0-9-]+\.)*formastudio\.cz$/i, /^https:\/\/[a-z0-9-]+\.vercel\.app$/i];

function originAllowed(origin) {
  return !!origin && ALLOWED.some((re) => re.test(origin));
}

// Per-IP throttle (best effort — lives as long as a warm serverless instance).
const HITS = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const SPAM_WORDS = /\b(seo|backlinks?|casino|crypto|bitcoin|forex|viagra|cialis|loan|guest ?post|rank(ing)? (your|on)|web ?traffic|telegram|whatsapp me|onlyfans|porn|betting)\b/i;

function spamReason(b) {
  if (b.company) return 'honeypot';
  const elapsed = Number(b.elapsed);
  if (!Number.isFinite(elapsed) || elapsed < 3000) return 'too-fast';
  const text = [b.name, b.message].filter(Boolean).join(' ');
  if (/[Ѐ-ӿ一-鿿]/.test(text)) return 'script';
  if (/https?:\/\/|www\./i.test(b.name || '')) return 'link-in-name';
  if (((b.message || '').match(/https?:\/\//gi) || []).length >= 2) return 'links';
  if (SPAM_WORDS.test(text)) return 'keywords';
  return null;
}

function rateLimited(ip) {
  const now = Date.now();
  const recent = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  HITS.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  let origin = req.headers.origin;
  if (!origin) { try { origin = new URL(req.headers.referer).origin; } catch { origin = ''; } }

  // CORS: reflect only allowed origins (never "*")
  if (originAllowed(req.headers.origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Real browsers always send Origin/Referer on a form POST; scripts hitting the API directly don't.
  if (!originAllowed(origin)) {
    console.warn('contact: blocked origin', origin || '(none)');
    return res.status(403).json({ error: 'Forbidden' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    console.warn('contact: rate limited', ip);
    return res.status(429).json({ error: 'Too many requests' });
  }

  const b = req.body || {};
  const { name, email, service, message } = b;

  // Spam (honeypot, instant submit, link/keyword/script spam): pretend success, send nothing.
  const reason = spamReason(b);
  if (reason) {
    console.warn('contact: spam dropped —', reason, email);
    return res.status(200).json({ success: true });
  }

  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Length caps — reject abusive payloads
  if (String(name).length > 120 || String(email).length > 160 ||
      String(service || '').length > 120 || String(message).length > 5000) {
    return res.status(400).json({ error: 'Input too long' });
  }

  // Simple email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    console.error('RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Resend sandbox sender can only deliver to the Resend account owner; CONTACT_EMAIL is set in Vercel.
  const TO_EMAIL = process.env.CONTACT_EMAIL || 'plant@wearetreed.com';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Forma Studio Web <onboarding@resend.dev>',
        to: [TO_EMAIL],
        reply_to: email,
        subject: `Nová poptávka — ${name}${service ? ' (' + service + ')' : ''}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px">
            <h2 style="color:#c94e1e;margin-bottom:1.5rem">Nová poptávka z webu</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:.5rem 0;color:#666;width:100px"><strong>Jméno:</strong></td><td>${escapeHtml(name)}</td></tr>
              <tr><td style="padding:.5rem 0;color:#666"><strong>Email:</strong></td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
              ${service ? `<tr><td style="padding:.5rem 0;color:#666"><strong>Služba:</strong></td><td>${escapeHtml(service)}</td></tr>` : ''}
            </table>
            <div style="margin-top:1.5rem;padding:1rem;background:#faf9f7;border-left:3px solid #c94e1e;white-space:pre-wrap">${escapeHtml(message)}</div>
            <p style="margin-top:2rem;font-size:.8rem;color:#999">Odesláno z kontaktního formuláře na formastudio.cz</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Send error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
