// api/claude.js — Vercel Edge Runtime
// Runs at the CDN edge node, not a separate Lambda.
// True streaming: bytes flow directly to the browser with no buffering layer.
// API key never touches the client.

export const config = { runtime: 'edge' };

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL             = 'claude-haiku-4-5-20251001';

// In-memory rate limiter (per isolate instance — good enough for low traffic)
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

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonError(msg, status) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405);
  }

  // Rate limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return jsonError('Too many requests. Please wait a moment before trying again.', 429);
  }

  // Parse body
  let body;
  try { body = await req.json(); }
  catch { return jsonError('Invalid request body.', 400); }

  const { prompt, maxTokens } = body || {};
  if (!prompt || typeof prompt !== 'string') return jsonError('Missing or invalid prompt.', 400);
  if (prompt.length > 20000)                 return jsonError('Prompt exceeds maximum length.', 400);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return jsonError('Server configuration error.', 500);

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
        stream:     true,
      }),
    });

    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json().catch(() => ({}));
      const msg = errData?.error?.message || `Anthropic API error ${anthropicRes.status}`;
      return jsonError(msg, anthropicRes.status);
    }

    // Pass the stream body straight through — edge runtime handles this natively,
    // no buffering, bytes arrive at the browser as Anthropic produces them.
    return new Response(anthropicRes.body, {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (err) {
    console.error('Edge function error:', err);
    return jsonError('Failed to reach AI service. Please try again.', 500);
  }
}
