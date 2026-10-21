// api/papers.js — Vercel Edge Runtime
// Proxies PubMed (NCBI E-utilities) server-side: ESearch for ids + count, EFetch for records.
// Always returns a JSON body with `papers` (array), `total` (int) and, when something is
// off, a human-readable `note` so the client can say WHY a list is empty.

export const config = { runtime: 'edge' };

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Publication-type filters appended to the user's query
const FILTERS = {
  all:     '',
  trial:   ' AND (randomized controlled trial[pt] OR clinical trial[pt])',
  review:  ' AND (systematic review[pt] OR meta-analysis[pt])',
  guideline: ' AND (guideline[pt] OR practice guideline[pt])',
  case:    ' AND (case reports[pt])',
};

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', ...extra },
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ncbi(path, params) {
  const key = process.env.NCBI_API_KEY;
  const qs = new URLSearchParams({ tool: 'jumpstartmed', ...params, ...(key ? { api_key: key } : {}) });
  let last = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE}/${path}?${qs}`, { headers: { Accept: 'application/json, text/xml' } });
      if (res.ok) return res;
      last = res.status;
      if (res.status === 429 || res.status >= 500) { await sleep(500 * (attempt + 1)); continue; }
      break;
    } catch {
      last = 502;
      await sleep(400);
    }
  }
  const err = new Error(`PubMed returned status ${last || 502}`);
  err.status = last || 502;
  throw err;
}

// ── tiny XML helpers (no DOMParser in the edge runtime) ──
const decode = s => (s || '')
  .replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
  .replace(/&amp;/g, '&')
  .trim();

const first = (xml, re) => { const m = xml.match(re); return m ? m[1] : ''; };

function parseArticle(xml) {
  const pmid = decode(first(xml, /<PMID[^>]*>(\d+)<\/PMID>/));
  const title = decode(first(xml, /<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/));

  // Abstract may be segmented (BACKGROUND / METHODS / ...)
  const abstractParts = [...xml.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map(m => {
    const label = (m[1].match(/Label="([^"]+)"/) || [])[1];
    const text = decode(m[2]);
    return label ? `${label}: ${text}` : text;
  });
  const abstract = abstractParts.join('\n');

  const journal = decode(first(xml, /<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/));
  const year = first(xml, /<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) ||
               first(xml, /<PubDate>[\s\S]*?<MedlineDate>(\d{4})/) ||
               first(xml, /<ArticleDate[^>]*>[\s\S]*?<Year>(\d{4})<\/Year>/);

  const authors = [...xml.matchAll(/<Author [^>]*>([\s\S]*?)<\/Author>/g)].map(m => {
    const last = decode(first(m[1], /<LastName>([\s\S]*?)<\/LastName>/));
    const init = decode(first(m[1], /<Initials>([\s\S]*?)<\/Initials>/));
    const coll = decode(first(m[1], /<CollectiveName>([\s\S]*?)<\/CollectiveName>/));
    return coll || [last, init].filter(Boolean).join(' ');
  }).filter(Boolean);

  const pubTypes = [...xml.matchAll(/<PublicationType[^>]*>([\s\S]*?)<\/PublicationType>/g)].map(m => decode(m[1]));
  const doi = decode(first(xml, /<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/));
  const pmcid = decode(first(xml, /<ArticleId IdType="pmc">([\s\S]*?)<\/ArticleId>/));

  return {
    pmid, title, abstract, journal, year: year ? Number(year) : null,
    authors: authors.slice(0, 6), authorCount: authors.length,
    pubTypes, doi, pmcid,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    freeUrl: pmcid ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/` : '',
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('query') || '').trim();
  if (!query) return json({ error: 'Missing query parameter.' }, 400);
  if (query.length > 600) return json({ error: 'Query too long.' }, 400);

  const filter = FILTERS[searchParams.get('filter')] !== undefined ? searchParams.get('filter') : 'all';
  const sort = searchParams.get('sort') === 'date' ? 'pub_date' : 'relevance';
  const term = `(${query})${FILTERS[filter]}`;

  try {
    // 1) ids + total count
    const sres = await ncbi('esearch.fcgi', {
      db: 'pubmed', retmode: 'json', retmax: '12', sort, term,
    });
    const sdata = await sres.json();
    const ids = sdata?.esearchresult?.idlist || [];
    const total = Number(sdata?.esearchresult?.count || 0);
    const warnings = sdata?.esearchresult?.warninglist?.outputmessages || [];
    const errorList = sdata?.esearchresult?.errorlist || null;

    if (!ids.length) {
      let note = 'PubMed returned no records for this search.';
      if (errorList?.phrasesnotfound?.length) note += ` Phrases not found: ${errorList.phrasesnotfound.join('; ')}.`;
      if (warnings.length) note += ` ${warnings.join(' ')}`;
      if (filter !== 'all') note += ' A publication-type filter is on; try "All types".';
      return json({ papers: [], total, note }, 200, { 'Cache-Control': 'public, max-age=120' });
    }

    // 2) full records
    const fres = await ncbi('efetch.fcgi', { db: 'pubmed', retmode: 'xml', id: ids.join(',') });
    const xml = await fres.text();
    const chunks = xml.split('<PubmedArticle>').slice(1);
    const byId = {};
    for (const c of chunks) {
      const a = parseArticle(c);
      if (a.pmid && a.title) byId[a.pmid] = a;
    }
    const papers = ids.map(id => byId[id]).filter(Boolean); // keep ESearch ranking

    const out = { papers, total };
    if (!papers.length) out.note = 'PubMed found records but they could not be read. Please try again.';
    return json(out, 200, { 'Cache-Control': 'public, max-age=300' });
  } catch (err) {
    console.error('PubMed error', String(err));
    return json({ error: err.message || 'Failed to reach PubMed.' }, err.status || 502);
  }
}
