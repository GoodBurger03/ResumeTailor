/**
 * Server-side job fetching library.
 * No CORS proxies needed — runs in Node, not the browser.
 * API keys are read from Azure Function environment variables.
 */

import axios from 'axios';

const ADZUNA_BASE  = 'https://api.adzuna.com/v1/api/jobs/us/search/1';
const MUSE_BASE    = 'https://www.themuse.com/api/public/jobs';
const USAJOBS_BASE = 'https://data.usajobs.gov/api/search';
const REMOTEOK_BASE= 'https://remoteok.com/api';

const TIMEOUT = 12000;

function stripHtml(s = '') {
  return s.replace(/</g, '').replace(/>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Adzuna ───────────────────────────────────────────────────────────────────

async function fetchAdzunaQuery(what, location) {
  const appId  = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const params = new URLSearchParams({
    app_id: appId, app_key: appKey,
    results_per_page: 50, what, sort_by: 'date',
  });
  if (location?.trim()) params.set('where', location.trim());

  try {
    const { data } = await axios.get(`${ADZUNA_BASE}?${params}`, { timeout: TIMEOUT });
    return (data.results || []).map((j) => ({
      id:       String(j.id || crypto.randomUUID()),
      title:    j.title,
      company:  j.company?.display_name || 'Unknown',
      location: j.location?.display_name || location || 'US',
      desc:     stripHtml(j.description).slice(0, 300),
      link:     j.redirect_url,
      pubDate:  j.created,
      salary:   j.salary_min ? `$${Math.round(j.salary_min/1000)}k – $${Math.round(j.salary_max/1000)}k` : null,
      source:   'Adzuna',
    }));
  } catch (e) {
    console.warn('[Adzuna] error:', e.message);
    return [];
  }
}

export async function fetchAdzuna(location = '') {
  if (!process.env.ADZUNA_APP_ID) return [];

  const QUERIES = [
    'Software Engineer', 'Support Engineer', 'Technical Sales Engineer',
    'Integration Engineer', 'Solutions Engineer', 'Technical Program Manager',
    'DevOps Engineer', 'Data Analyst', 'Product Manager',
  ];

  const batches = [QUERIES.slice(0, 3), QUERIES.slice(3, 6), QUERIES.slice(6)];
  const all = [];

  for (const batch of batches) {
    const results = await Promise.allSettled(batch.map((q) => fetchAdzunaQuery(q, location)));
    all.push(...results.flatMap((r) => r.status === 'fulfilled' ? r.value : []));
    await new Promise((r) => setTimeout(r, 300));
  }

  return all;
}

// ─── The Muse ─────────────────────────────────────────────────────────────────

const MUSE_CATS = [
  'Software Engineer', 'Sales', 'IT', 'Project Management',
  'Data', 'Customer Service', 'Business Intelligence', 'Product Management',
];

export async function fetchMuse() {
  const apiKey = process.env.MUSE_API_KEY;
  if (!apiKey) return [];

  const results = await Promise.allSettled(
    MUSE_CATS.map(async (category) => {
      const params = new URLSearchParams({ api_key: apiKey, category, page: 0, count: 20 });
      try {
        const { data } = await axios.get(`${MUSE_BASE}?${params}`, { timeout: TIMEOUT });
        return (data.results || []).map((j) => ({
          id:       String(j.id || crypto.randomUUID()),
          title:    j.name,
          company:  j.company?.name || 'Unknown',
          location: j.locations?.map((l) => l.name).join(', ') || 'US',
          desc:     stripHtml(j.contents).slice(0, 300),
          link:     j.refs?.landing_page || '',
          pubDate:  j.publication_date,
          salary:   null,
          source:   'The Muse',
        }));
      } catch { return []; }
    })
  );

  return results.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
}

// ─── USAJobs ──────────────────────────────────────────────────────────────────

const USA_QUERIES = ['Software Engineer', 'Technical', 'IT Specialist', 'Program Manager', 'Data Analyst'];

export async function fetchUSAJobs(location = '') {
  const apiKey    = process.env.USAJOBS_API_KEY;
  const userAgent = process.env.USAJOBS_USER_AGENT;
  if (!apiKey || !userAgent) return [];

  const results = await Promise.allSettled(
    USA_QUERIES.map(async (keyword) => {
      const params = new URLSearchParams({
        Keyword: keyword, ResultsPerPage: 25,
        SortField: 'OpenDate', SortDirection: 'Desc',
      });
      if (location?.trim() && location.toLowerCase() !== 'remote') {
        params.set('LocationName', location.trim());
      }
      try {
        const { data } = await axios.get(`${USAJOBS_BASE}?${params}`, {
          headers: { 'Authorization-Key': apiKey, 'User-Agent': userAgent, Host: 'data.usajobs.gov' },
          timeout: TIMEOUT,
        });
        return (data.SearchResult?.SearchResultItems || []).map((item) => {
          const j   = item.MatchedObjectDescriptor;
          const rem = j.PositionRemuneration?.[0];
          return {
            id:       j.PositionID || crypto.randomUUID(),
            title:    j.PositionTitle,
            company:  j.OrganizationName,
            location: j.PositionLocationDisplay || 'US',
            desc:     stripHtml(j.QualificationSummary || '').slice(0, 300),
            link:     j.PositionURI,
            pubDate:  j.PublicationStartDate,
            salary:   rem ? `$${Math.round(rem.MinimumRange/1000)}k – $${Math.round(rem.MaximumRange/1000)}k` : null,
            source:   'USAJobs',
          };
        });
      } catch { return []; }
    })
  );

  return results.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
}

// ─── RemoteOK ─────────────────────────────────────────────────────────────────

export async function fetchRemoteOK() {
  try {
    const { data } = await axios.get(REMOTEOK_BASE, {
      headers: { Accept: 'application/json', 'User-Agent': 'JobTailor/1.0' },
      timeout: TIMEOUT,
    });
    return (Array.isArray(data) ? data.slice(1) : []).map((j) => ({
      id:       String(j.id || crypto.randomUUID()),
      title:    j.position || '',
      company:  j.company  || 'Unknown',
      location: 'Remote',
      desc:     stripHtml(j.description || '').slice(0, 300),
      link:     j.url || `https://remoteok.com/remote-jobs/${j.slug}`,
      pubDate:  j.date,
      salary:   j.salary || null,
      tags:     (j.tags || []).map((t) => t.toLowerCase()),
      source:   'RemoteOK',
    }));
  } catch { return []; }
}

// ─── Deduplication ────────────────────────────────────────────────────────────

export function dedupe(jobs) {
  const seen = new Set();
  return jobs.filter((j) => {
    if (!j.title || !j.link) return false;
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
