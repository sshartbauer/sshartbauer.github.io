// api/claude.js — Vercel serverless function
// Proxies requests to Anthropic API using a server-side key.
// The API key never touches the client.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL             = 'claude-haiku-4-5-20251001';

// ── Simple in-memory rate limiter ──────────────────────────────────────────
// Resets on cold start (per-instance), which is fine for low traffic.
// For production, swap this out for Upstash Redis:
//   https://vercel.com/marketplace/upstash
const rateLimitMap = new Map();   // ip → { count, windowStart }
const RATE_LIMIT   = 20;          // max requests per window
const WINDOW_MS    = 60 * 1000;   // 1 minute window

function checkRateLimit(ip) {
  const now  = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, windowStart: now };

  // Reset window if expired
  if (now - entry.windowStart > WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count += 1;
  rateLimitMap.set(ip, entry);

  return entry.count <= RATE_LIMIT;
}

// ── Handler ────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // CORS headers on every response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
  }

  // Validate request body
  const { prompt, maxTokens } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt.' });
  }
  if (prompt.length > 20000) {
    return res.status(400).json({ error: 'Prompt exceeds maximum length.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable is not set.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  // Forward to Anthropic
  try {
    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: Math.min(maxTokens || 2000, 4000), // cap at 4k
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      const msg = data?.error?.message || `Anthropic API error ${anthropicRes.status}`;
      return res.status(anthropicRes.status).json({ error: msg });
    }

    return res.status(200).json({ text: data.content[0].text });

  } catch (err) {
    console.error('Error calling Anthropic:', err);
    return res.status(500).json({ error: 'Failed to reach AI service. Please try again.' });
  }
}
