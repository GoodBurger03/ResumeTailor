/**
 * Job feed service.
 * Keys read from settings (localStorage > .env fallback).
 *
 * Sources:
 *   Adzuna   — broad US listings  (free key: developer.adzuna.com)
 *   The Muse — tech/startup       (free key: themuse.com/developers)
 *   USAJobs  — federal jobs       (free key: developer.usajobs.gov)
 *   RemoteOK — remote (no key)
 *
 * NOTE: Adzuna does NOT support browser CORS. All requests go through
 * corsproxy.io which is reliable and free.
 */

import { getAdzunaId, getAdzunaKey, getMuseKey, getUSAJobsKey, getUSAJobsEmail } from './settings.js';

const CORS_PROXY    = 'https://corsproxy.io/?';
const ADZUNA_BASE   = 'https://api.adzuna.com/v1/api/jobs/us/search/1';
const MUSE_BASE     = 'https://www.themuse.com/api/public/jobs';
const USAJOBS_BASE  = 'https://data.usajobs.gov/api/search';
const REMOTEOK_BASE = 'https://remoteok.com/api';

function proxy(url) {
  return CORS_PROXY + encodeURIComponent(url);
}

function stripHtml(str = '') {
  return str.replace(/</g, '').replace(/>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Adzuna ───────────────────────────────────────────────────────────────────

async function fetchAdzunaQuery(query, location) {
  const appId  = getAdzunaId();
  const appKey = getAdzunaKey();
  if (!appId || !appKey) return [];

  const params = new URLSearchParams({
    app_id: appId, app_key: appKey,
    results_per_page: 50, what: query, sort_by: 'date',
  });
  if (location?.trim()) params.set('where', location.trim());

  const url = `${ADZUNA_BASE}?${params}`;
  try {
    const res = await fetch(proxy(url), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) { console.warn(`Adzuna ${res.status} for "${query}"`); return []; }
    const data = await res.json();
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
  } catch (e) { console.warn('Adzuna error:', e.message); return []; }
}

async function fetchAdzuna(location) {
  if (!getAdzunaId()) return [];
  // Stagger batches to avoid rate limits
  const batches = [
    ['Software Engineer', 'Support Engineer', 'Technical Sales Engineer'],
    ['Integration Engineer', 'Solutions Engineer', 'Technical Program Manager'],
    ['DevOps Engineer', 'Data Analyst', 'Product Manager'],
  ];
  const all = [];
  for (const batch of batches) {
    const results = await Promise.allSettled(batch.map((q) => fetchAdzunaQuery(q, location)));
    all.push(...results.flatMap((r) => r.status === 'fulfilled' ? r.value : []));
    await new Promise((r) => setTimeout(r, 400));
  }
  return all;
}

// ─── The Muse ─────────────────────────────────────────────────────────────────

const MUSE_CATEGORIES = [
  'Software Engineer', 'Sales', 'IT', 'Project Management',
  'Data', 'Customer Service', 'Business Intelligence', 'Product Management',
];

async function fetchMuse() {
  const apiKey = getMuseKey();
  if (!apiKey) return [];

  const results = await Promise.allSettled(
    MUSE_CATEGORIES.map(async (category) => {
      const params = new URLSearchParams({ api_key: apiKey, category, page: 0, count: 20 });
      try {
        const res  = await fetch(`${MUSE_BASE}?${params}`, { signal: AbortSignal.timeout(8000) });
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
  return results.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
}

// ─── USAJobs ──────────────────────────────────────────────────────────────────

async function fetchUSAJobs(location) {
  const apiKey    = getUSAJobsKey();
  const userAgent = getUSAJobsEmail();
  if (!apiKey || !userAgent) return [];

  const queries = ['Software Engineer', 'Technical', 'IT Specialist', 'Program Manager', 'Data Analyst'];
  const results = await Promise.allSettled(
    queries.map(async (query) => {
      const params = new URLSearchParams({
        Keyword: query, ResultsPerPage: 25, SortField: 'OpenDate', SortDirection: 'Desc',
      });
      if (location?.trim() && location.toLowerCase() !== 'remote') {
        params.set('LocationName', location.trim());
      }
      try {
        const res = await fetch(`${USAJOBS_BASE}?${params}`, {
          headers: { 'Authorization-Key': apiKey, 'User-Agent': userAgent, 'Host': 'data.usajobs.gov' },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.SearchResult?.SearchResultItems || []).map((item) => {
          const j = item.MatchedObjectDescriptor;
          return {
            id:       j.PositionID || crypto.randomUUID(),
            title:    j.PositionTitle,
            company:  j.OrganizationName,
            location: j.PositionLocationDisplay || 'US',
            desc:     stripHtml(j.QualificationSummary || '').slice(0, 300),
            link:     j.PositionURI,
            pubDate:  j.PublicationStartDate,
            salary:   j.PositionRemuneration?.[0]
              ? `$${Math.round(j.PositionRemuneration[0].MinimumRange/1000)}k – $${Math.round(j.PositionRemuneration[0].MaximumRange/1000)}k`
              : null,
            source: 'USAJobs',
          };
        });
      } catch { return []; }
    })
  );
  return results.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
}

// ─── RemoteOK ─────────────────────────────────────────────────────────────────

let roCache = null;

async function fetchRemoteOK() {
  if (roCache) return roCache;
  try {
    const res = await fetch(proxy(REMOTEOK_BASE), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    roCache = (Array.isArray(data) ? data.slice(1) : []).map((j) => ({
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
    return roCache;
  } catch { return []; }
}

// ─── Deduplication ────────────────────────────────────────────────────────────

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

export async function fetchJobs(location = '') {
  const [adzunaJobs, museJobs, usaJobs, roJobs] = await Promise.all([
    fetchAdzuna(location),
    fetchMuse(),
    fetchUSAJobs(location),
    fetchRemoteOK(),
  ]);
  const all = [...adzunaJobs, ...museJobs, ...usaJobs, ...roJobs];
  return dedupe(all).sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
}

export function getActiveSources() {
  const s = ['RemoteOK'];
  if (getAdzunaId() && getAdzunaKey()) s.push('Adzuna');
  if (getMuseKey())                    s.push('The Muse');
  if (getUSAJobsKey())                 s.push('USAJobs');
  return s;
}
