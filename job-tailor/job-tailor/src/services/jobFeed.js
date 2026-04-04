/**
 * Job feed service.
 *
 * Sources:
 *   Adzuna   — broad US listings  (free key: developer.adzuna.com)
 *   The Muse — tech/startup       (free key: themuse.com/developers)
 *   USAJobs  — federal jobs       (free key: developer.usajobs.gov)
 *   RemoteOK — remote only (no key needed)
 *
 * Adzuna does NOT support browser CORS — requests go through corsproxy.io.
 */

import { getAdzunaId, getAdzunaKey, getMuseKey, getUSAJobsKey, getUSAJobsEmail } from './settings.js';

const CORS      = 'https://corsproxy.io/?';
const ADZUNA    = 'https://api.adzuna.com/v1/api/jobs/us/search/1';
const MUSE      = 'https://www.themuse.com/api/public/jobs';
const USAJOBS   = 'https://data.usajobs.gov/api/search';
const REMOTEOK  = 'https://remoteok.com/api';

// Per-session cache so refresh only re-fetches when user explicitly asks
const cache = { adzuna: null, muse: null, usa: null, ro: null };

function proxied(url) {
  return CORS + encodeURIComponent(url);
}

function stripHtml(s = '') {
  return s.replace(/</g, '').replace(/>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Adzuna ───────────────────────────────────────────────────────────────────

async function adzunaQuery(what, location) {
  const id  = getAdzunaId();
  const key = getAdzunaKey();
  if (!id || !key) return [];

  // Build the target URL, then wrap in proxy
  const params = new URLSearchParams({ app_id: id, app_key: key, results_per_page: 50, what, sort_by: 'date' });
  if (location?.trim()) params.set('where', location.trim());
  const targetUrl = `${ADZUNA}?${params}`;

  try {
    const res = await fetch(proxied(targetUrl), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[Adzuna] ${res.status} for "${what}":`, body.slice(0, 200));
      return [];
    }

    const data = await res.json();
    return (data.results || []).map((j) => ({
      id:       String(j.id || crypto.randomUUID()),
      title:    j.title,
      company:  j.company?.display_name || 'Unknown',
      location: j.location?.display_name || location || 'US',
      desc:     stripHtml(j.description).slice(0, 300),
      link:     j.redirect_url,
      pubDate:  j.created,
      salary:   j.salary_min ? `$${Math.round(j.salary_min / 1000)}k – $${Math.round(j.salary_max / 1000)}k` : null,
      source:   'Adzuna',
    }));
  } catch (e) {
    console.warn('[Adzuna] fetch error:', e.message);
    return [];
  }
}

async function fetchAdzuna(location, bustCache = false) {
  if (cache.adzuna && !bustCache) return cache.adzuna;
  if (!getAdzunaId()) return [];

  const BATCHES = [
    ['Software Engineer', 'Support Engineer', 'Technical Sales Engineer'],
    ['Integration Engineer', 'Solutions Engineer', 'Technical Program Manager'],
    ['DevOps Engineer', 'Data Analyst', 'Product Manager'],
  ];

  const all = [];
  for (const batch of BATCHES) {
    const results = await Promise.allSettled(batch.map((q) => adzunaQuery(q, location)));
    all.push(...results.flatMap((r) => r.status === 'fulfilled' ? r.value : []));
    await new Promise((r) => setTimeout(r, 500)); // polite delay between batches
  }

  cache.adzuna = all;
  return all;
}

// ─── The Muse ─────────────────────────────────────────────────────────────────

const MUSE_CATS = [
  'Software Engineer', 'Sales', 'IT', 'Project Management',
  'Data', 'Customer Service', 'Business Intelligence', 'Product Management',
];

async function fetchMuse(bustCache = false) {
  if (cache.muse && !bustCache) return cache.muse;
  const apiKey = getMuseKey();
  if (!apiKey) return [];

  const results = await Promise.allSettled(
    MUSE_CATS.map(async (category) => {
      const params = new URLSearchParams({ api_key: apiKey, category, page: 0, count: 20 });
      try {
        const res  = await fetch(`${MUSE}?${params}`, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return [];
        const data = await res.json();
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

  cache.muse = results.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
  return cache.muse;
}

// ─── USAJobs ──────────────────────────────────────────────────────────────────

async function fetchUSAJobs(location, bustCache = false) {
  if (cache.usa && !bustCache) return cache.usa;
  const apiKey    = getUSAJobsKey();
  const userAgent = getUSAJobsEmail();
  if (!apiKey || !userAgent) return [];

  const queries = ['Software Engineer', 'Technical', 'IT Specialist', 'Program Manager', 'Data Analyst'];
  const results = await Promise.allSettled(
    queries.map(async (q) => {
      const params = new URLSearchParams({ Keyword: q, ResultsPerPage: 25, SortField: 'OpenDate', SortDirection: 'Desc' });
      if (location?.trim() && location.toLowerCase() !== 'remote') params.set('LocationName', location.trim());
      try {
        const res = await fetch(`${USAJOBS}?${params}`, {
          headers: { 'Authorization-Key': apiKey, 'User-Agent': userAgent, Host: 'data.usajobs.gov' },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.SearchResult?.SearchResultItems || []).map((item) => {
          const j = item.MatchedObjectDescriptor;
          const rem = j.PositionRemuneration?.[0];
          return {
            id:       j.PositionID || crypto.randomUUID(),
            title:    j.PositionTitle,
            company:  j.OrganizationName,
            location: j.PositionLocationDisplay || 'US',
            desc:     stripHtml(j.QualificationSummary || '').slice(0, 300),
            link:     j.PositionURI,
            pubDate:  j.PublicationStartDate,
            salary:   rem ? `$${Math.round(rem.MinimumRange / 1000)}k – $${Math.round(rem.MaximumRange / 1000)}k` : null,
            source:   'USAJobs',
          };
        });
      } catch { return []; }
    })
  );

  cache.usa = results.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
  return cache.usa;
}

// ─── RemoteOK ─────────────────────────────────────────────────────────────────

async function fetchRemoteOK(bustCache = false) {
  if (cache.ro && !bustCache) return cache.ro;
  try {
    const res = await fetch(proxied(REMOTEOK), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    cache.ro = (Array.isArray(data) ? data.slice(1) : []).map((j) => ({
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
    return cache.ro;
  } catch { return []; }
}

// ─── Dedupe ───────────────────────────────────────────────────────────────────

function dedupe(jobs) {
  const seen = new Set();
  return jobs.filter((j) => {
    if (!j.title || !j.link) return false;
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * @param {string} location
 * @param {boolean} bustCache  Pass true to force re-fetch all sources
 */
export async function fetchJobs(location = '', bustCache = false) {
  // Clear location-sensitive caches if location changed
  if (bustCache) { cache.adzuna = null; cache.usa = null; }

  const [az, mu, us, ro] = await Promise.all([
    fetchAdzuna(location, bustCache),
    fetchMuse(bustCache),
    fetchUSAJobs(location, bustCache),
    fetchRemoteOK(bustCache),
  ]);

  return dedupe([...az, ...mu, ...us, ...ro])
    .sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
}

export function getActiveSources() {
  const s = ['RemoteOK'];
  if (getAdzunaId() && getAdzunaKey()) s.push('Adzuna');
  if (getMuseKey())                    s.push('The Muse');
  if (getUSAJobsKey())                 s.push('USAJobs');
  return s;
}

export function clearJobCache() {
  cache.adzuna = null; cache.muse = null; cache.usa = null; cache.ro = null;
}
