// Vercel serverless proxy — fixes the CORS block on direct Apps Script calls.
// Same pattern as the VP Command Center / other Mangalam HQ tools:
// the browser calls /api/sheet (same origin), this forwards to Apps Script
// server-side (no CORS there) and follows the 302 redirect chain.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqW62sN83MvGp455CIJCvbtcQc76mB1pa6nnTKguOabYwye8-WKmtWcIW2wazWpcKy/exec';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const options = { method: req.method, redirect: 'follow' };
    if (req.method === 'POST') {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }
    const upstream = await fetch(APPS_SCRIPT_URL, options);
    const text = await upstream.text();

    // Apps Script returns HTML (an error page / auth page) instead of JSON when
    // the deployment is broken or access isn't "Anyone" — surface that clearly
    // instead of letting the frontend choke on JSON.parse.
    if (text.trim().startsWith('<')) {
      return res.status(200).json({
        ok: false,
        error: 'Apps Script returned an error page instead of JSON. Check: (1) latest code has no compile errors, (2) you created a NEW deployment after editing, (3) access is set to "Anyone".'
      });
    }
    res.status(200).send(text);
  } catch (e) {
    res.status(200).json({ ok: false, error: 'Proxy error: ' + e.message });
  }
}
