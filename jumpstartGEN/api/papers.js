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

  try {
    const ssKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        ...(ssKey ? { 'x-api-key': ssKey } : {}),
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return jsonError(body?.message || `Semantic Scholar error ${res.status}`, res.status);
    }
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    return jsonError('Failed to reach Semantic Scholar.', 502);
  }
}
