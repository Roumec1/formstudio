export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');

  const { name, email, service, message } = req.body;

  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
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
