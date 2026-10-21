// api/trials.js — Vercel Edge Runtime
// Proxies the ClinicalTrials.gov v2 API so the client can ask "is someone already running this?"

export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', ...extra },
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('query') || '').trim();
  if (!query) return json({ error: 'Missing query parameter.' }, 400);
  if (query.length > 400) return json({ error: 'Query too long.' }, 400);

  const qs = new URLSearchParams({
    'query.term': query,
    pageSize: '6',
    countTotal: 'true',
    fields: 'NCTId|BriefTitle|OverallStatus|Phase|StudyType|StartDate|EnrollmentCount|LeadSponsorName',
  });

  try {
    const res = await fetch(`https://clinicaltrials.gov/api/v2/studies?${qs}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return json({ error: `ClinicalTrials.gov returned status ${res.status}` }, res.status);
    const data = await res.json();
    const trials = (data.studies || []).map(s => {
      const p = s.protocolSection || {};
      return {
        nctId:   p.identificationModule?.nctId || '',
        title:   p.identificationModule?.briefTitle || '',
        status:  p.statusModule?.overallStatus || '',
        start:   p.statusModule?.startDateStruct?.date || '',
        phase:   (p.designModule?.phases || []).join(', '),
        type:    p.designModule?.studyType || '',
        n:       p.designModule?.enrollmentInfo?.count ?? null,
        sponsor: p.sponsorCollaboratorsModule?.leadSponsor?.name || '',
      };
    }).filter(t => t.nctId);
    const out = { trials, total: data.totalCount ?? trials.length };
    if (!trials.length) out.note = 'No registered studies matched this search.';
    return json(out, 200, { 'Cache-Control': 'public, max-age=300' });
  } catch (err) {
    console.error('Trials error', String(err));
    return json({ error: 'Failed to reach ClinicalTrials.gov.' }, 502);
  }
}
