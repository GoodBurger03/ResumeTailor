/**
 * Job feed service.
 * All API keys are read from the settings service (localStorage > .env fallback).
 *
 * Sources:
 *   Adzuna    — broad US listings   https://developer.adzuna.com
 *   The Muse  — tech/startup        https://www.themuse.com/developers/api/v2
 *   USAJobs   — federal jobs        https://developer.usajobs.gov
 *   RemoteOK  — remote tech (no key required)
 */

import { getAdzunaId, getAdzunaKey, getMuseKey, getUSAJobsKey, getUSAJobsEmail } from './settings.js';

const ADZUNA_BASE  = 'https://api.adzuna.com/v1/api/jobs/us/search/1';
const MUSE_BASE    = 'https://www.themuse.com/api/public/jobs';
const USAJOBS_BASE = 'https://data.usajobs.gov/api/search';
const REMOTEOK_BASE = 'https://remoteok.com/api';

export const DEFAULT_QUERIES = [
  'Software Engineer',
  'Integration Engineer',
  'Technical Sales Engineer',
  'Solutions Engineer',
  'Support Engineer',
  'Technical Program Manager',
];

function stripHtml(str = '') {
  return str.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Adzuna ───────────────────────────────────────────────────────────────────

async function fetchAdzuna(query, location) {
  const appId  = getAdzunaId();
  const appKey = getAdzunaKey();
  if (!appId || !appKey) return [];

  const params = new URLSearchParams({
    app_id: appId, app_key: appKey,
    results_per_page: 10, what: query, sort_by: 'date', content_type: 'application/json',
  });
  if (location?.trim()) params.set('where', location.trim());

  try {
    const res  = await fetch(`${ADZUNA_BASE}?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((j) => ({
      id: String(j.id || crypto.randomUUID()), title: j.title,
      company: j.company?.display_name || 'Unknown',
      location: j.location?.display_name || location || 'US',
      desc: stripHtml(j.description).slice(0, 220),
      link: j.redirect_url, pubDate: j.created,
      salary: j.salary_min ? `$${Math.round(j.salary_min/1000)}k – $${Math.round(j.salary_max/1000)}k` : null,
      source: 'Adzuna',
    }));
  } catch { return []; }
}

// ─── The Muse ─────────────────────────────────────────────────────────────────

const MUSE_CATEGORY_MAP = {
  'Software Engineer':         'Software Engineer',
  'Integration Engineer':      'Software Engineer',
  'Technical Sales Engineer':  'Sales',
  'Solutions Engineer':        'Software Engineer',
  'Support Engineer':          'IT',
  'Technical Program Manager': 'Project Management',
};

async function fetchMuse(query) {
  const apiKey = getMuseKey();
  if (!apiKey) return [];

  const params = new URLSearchParams({ api_key: apiKey, category: MUSE_CATEGORY_MAP[query] || 'Software Engineer', page: 0 });
  try {
    const res  = await fetch(`${MUSE_BASE}?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, 10).map((j) => ({
      id: String(j.id || crypto.randomUUID()), title: j.name,
      company: j.company?.name || 'Unknown',
      location: j.locations?.map((l) => l.name).join(', ') || 'US',
      desc: stripHtml(j.contents).slice(0, 220),
      link: j.refs?.landing_page || '', pubDate: j.publication_date,
      salary: null, source: 'The Muse',
    }));
  } catch { return []; }
}

// ─── USAJobs ──────────────────────────────────────────────────────────────────

async function fetchUSAJobs(query, location) {
  const apiKey    = getUSAJobsKey();
  const userAgent = getUSAJobsEmail();
  if (!apiKey || !userAgent) return [];

  const params = new URLSearchParams({ Keyword: query, ResultsPerPage: 10, SortField: 'OpenDate', SortDirection: 'Desc' });
  if (location?.trim() && location.toLowerCase() !== 'remote') params.set('LocationName', location.trim());

  try {
    const res = await fetch(`${USAJOBS_BASE}?${params}`, {
      headers: { 'Authorization-Key': apiKey, 'User-Agent': userAgent, 'Host': 'data.usajobs.gov' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.SearchResult?.SearchResultItems || []).map((item) => {
      const j = item.MatchedObjectDescriptor;
      return {
        id: j.PositionID || crypto.randomUUID(), title: j.PositionTitle,
        company: j.OrganizationName, location: j.PositionLocationDisplay || 'US',
        desc: stripHtml(j.QualificationSummary || '').slice(0, 220),
        link: j.PositionURI, pubDate: j.PublicationStartDate,
        salary: j.PositionRemuneration?.[0]
          ? `$${Math.round(j.PositionRemuneration[0].MinimumRange/1000)}k – $${Math.round(j.PositionRemuneration[0].MaximumRange/1000)}k`
          : null,
        source: 'USAJobs',
      };
    });
  } catch { return []; }
}

// ─── RemoteOK ─────────────────────────────────────────────────────────────────

const REMOTEOK_TAGS = {
  'Software Engineer':         ['software','engineer','backend','fullstack'],
  'Integration Engineer':      ['integration','api','engineer'],
  'Technical Sales Engineer':  ['sales','solutions','presales'],
  'Solutions Engineer':        ['solutions','engineer','devrel'],
  'Support Engineer':          ['support','customer','success'],
  'Technical Program Manager': ['manager','program','product'],
};

let roCache = null;

async function fetchRemoteOK() {
  if (roCache) return roCache;
  try {
    const res  = await fetch('https://corsproxy.io/?' + encodeURIComponent(REMOTEOK_BASE), {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    roCache = (Array.isArray(data) ? data.slice(1) : []).map((j) => ({
      id: String(j.id || crypto.randomUUID()), title: j.position || '',
      company: j.company || 'Unknown', location: 'Remote',
      desc: stripHtml(j.description).slice(0, 220),
      link: j.url || `https://remoteok.com/remote-jobs/${j.slug}`,
      pubDate: j.date, salary: j.salary || null,
      tags: (j.tags || []).map((t) => t.toLowerCase()), source: 'RemoteOK',
    }));
    return roCache;
  } catch { return []; }
}

function filterRemoteOK(jobs, query) {
  const kw = (REMOTEOK_TAGS[query] || query.toLowerCase().split(' ')).map((k) => k.toLowerCase());
  return jobs.filter((j) => kw.some((k) => `${j.title} ${j.tags?.join(' ')||''}`.toLowerCase().includes(k)));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchJobs(queries = DEFAULT_QUERIES, location = '') {
  const [adzunaAll, museAll, usaAll, roRaw] = await Promise.all([
    Promise.allSettled(queries.slice(0,3).map((q) => fetchAdzuna(q, location)))
      .then((rs) => rs.flatMap((r) => r.status === 'fulfilled' ? r.value : [])),
    Promise.allSettled([...new Set(queries.map((q) => MUSE_CATEGORY_MAP[q]||'Software Engineer'))].slice(0,2).map(fetchMuse))
      .then((rs) => rs.flatMap((r) => r.status === 'fulfilled' ? r.value : [])),
    Promise.allSettled(queries.slice(0,2).map((q) => fetchUSAJobs(q, location)))
      .then((rs) => rs.flatMap((r) => r.status === 'fulfilled' ? r.value : [])),
    fetchRemoteOK(),
  ]);

  const roResults = queries.flatMap((q) => filterRemoteOK(roRaw, q));
  const all = [...adzunaAll, ...museAll, ...usaAll, ...roResults];

  const seen = new Set();
  return all
    .filter((j) => {
      if (!j.title || !j.link) return false;
      const key = `${j.title}|${j.company}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.pubDate||0) - new Date(a.pubDate||0));
}

export function getActiveSources() {
  const s = ['RemoteOK'];
  if (getAdzunaId() && getAdzunaKey()) s.push('Adzuna');
  if (getMuseKey())                    s.push('The Muse');
  if (getUSAJobsKey() && getUSAJobsEmail()) s.push('USAJobs');
  return s;
}

export function hasAdzunaKeys() {
  return !!(getAdzunaId() && getAdzunaKey());
}
