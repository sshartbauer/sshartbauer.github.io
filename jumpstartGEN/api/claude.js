// api/claude.js — Vercel serverless function
// Streams Anthropic API responses to avoid proxy/edge timeout on slow generations.
// The API key never touches the client.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL             = 'claude-haiku-4-5-20251001';

// ── Simple in-memory rate limiter ──────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT   = 20;
const WINDOW_MS    = 60 * 1000;

function checkRateLimit(ip) {
  const now   = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, windowStart: now };
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
  // CORS on every response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
             || req.socket?.remoteAddress
             || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
  }

  // Validate
  const { prompt, maxTokens } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt.' });
  }
  if (prompt.length > 20000) {
    return res.status(400).json({ error: 'Prompt exceeds maximum length.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

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
        max_tokens: Math.min(maxTokens || 1200, 2000),
        messages:   [{ role: 'user', content: prompt }],
        stream:     true,   // ← enables token-by-token streaming
      }),
    });

    // If Anthropic itself errored before streaming started, relay the error as JSON
    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json().catch(() => ({}));
      const msg = errData?.error?.message || `Anthropic API error ${anthropicRes.status}`;
      return res.status(anthropicRes.status).json({ error: msg });
    }

    // Stream SSE back to client — bytes flow continuously, no proxy timeout
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx/edge buffering

    const reader = anthropicRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();

  } catch (err) {
    console.error('Streaming error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to reach AI service. Please try again.' });
    } else {
      res.end();
    }
  }
};
