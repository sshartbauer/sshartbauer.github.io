// api/papers.js — Vercel Edge Runtime
// Proxies Semantic Scholar API server-side to avoid CORS and share rate-limit headroom.

export const config = { runtime: 'edge' };

const SS_BASE  = 'https://api.semanticscholar.org/graph/v1/paper/search';
const FIELDS   = 'title,authors,year,abstract,citationCount,isOpenAccess,openAccessPdf,journal,publicationTypes,externalIds';
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonError(msg, status) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');
  if (!query) return jsonError('Missing query parameter.', 400);

  const url = `${SS_BASE}?query=${encodeURIComponent(query)}&fields=${FIELDS}&limit=12`;

  const ssKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Try with the key first. If the key is rejected (401/403), retry once without it.
  // Retry 429/5xx with short backoff (Edge functions have limited time, keep it tight).
  let useKey = !!ssKey;
  let lastStatus = 0;
  let lastMsg = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          ...(useKey ? { 'x-api-key': ssKey } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
        });
      }
      lastStatus = res.status;
      const body = await res.json().catch(() => ({}));
      lastMsg = body?.message || body?.error || '';
      console.error('S2 error', res.status, lastMsg, 'key:', useKey);

      if ((res.status === 401 || res.status === 403) && useKey) {
        useKey = false; // bad/expired key, fall back to unauthenticated
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        await sleep(600 * (attempt + 1));
        continue;
      }
      break; // other 4xx, retrying will not help
    } catch (err) {
      console.error('S2 fetch failed', String(err));
      lastStatus = 502;
      lastMsg = 'Failed to reach Semantic Scholar.';
      await sleep(400);
    }
  }
  return jsonError(lastMsg || `Semantic Scholar error ${lastStatus}`, lastStatus || 502);
}
