// Only our own site may submit the form. Vercel preview deploys (*.vercel.app)
// are allowed so staging works; everything else is rejected.
const ALLOWED = [/^https:\/\/([a-z0-9-]+\.)*formastudio\.cz$/i, /^https:\/\/[a-z0-9-]+\.vercel\.app$/i];

function originAllowed(origin) {
  return !!origin && ALLOWED.some((re) => re.test(origin));
}

export default async function handler(req, res) {
  const origin = req.headers.origin;

  // CORS: reflect only allowed origins (never "*")
  if (originAllowed(origin)) {
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

  // Block cross-site browser submissions (a present Origin must be on the allowlist;
  // same-origin/no-Origin requests are permitted).
  if (origin && !originAllowed(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { name, email, service, message, company } = req.body || {};

  // Honeypot — bots fill the hidden "company" field. Pretend success, send nothing.
  if (company) {
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
