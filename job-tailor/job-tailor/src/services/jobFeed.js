/**
 * Job feed service.
 * Production: fetches from job-tailor-api Azure Function (VITE_API_URL set).
 * Development: fetches directly from job APIs via corsproxy.io.
 */

import { getAdzunaId, getAdzunaKey, getMuseKey, getUSAJobsKey, getUSAJobsEmail } from './settings.js';

const API_URL   = import.meta.env.VITE_API_URL;
const CORS      = 'https://corsproxy.io/?';
const ADZUNA    = 'https://api.adzuna.com/v1/api/jobs/us/search/1';
const MUSE      = 'https://www.themuse.com/api/public/jobs';
const USAJOBS   = 'https://data.usajobs.gov/api/search';
const REMOTEOK  = 'https://remoteok.com/api';

const cache = { jobs: null, cacheKey: null };

function stripHtml(s = '') {
  return s.replace(/</g, '').replace(/>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Production: call backend ─────────────────────────────────────────────────

async function fetchViaBackend(location, bustCache) {
  const params = new URLSearchParams();
  if (location) params.set('location', location);
  if (bustCache) params.set('refresh', 'true');

  const res = await fetch(`${API_URL}/jobs?${params}`);
  if (!res.ok) throw new Error(`Job API error ${res.status}`);
  const data = await res.json();
  return data.jobs || [];
}

// ─── Dev: fetch directly ──────────────────────────────────────────────────────

function proxied(url) { return CORS + encodeURIComponent(url); }

async function devAdzuna(location) {
  const id = getAdzunaId(), key = getAdzunaKey();
  if (!id || !key) return [];
  const QUERIES = ['Software Engineer', 'Support Engineer', 'Technical Sales Engineer', 'Integration Engineer', 'Solutions Engineer', 'Technical Program Manager'];
  const all = [];
  for (const batch of [QUERIES.slice(0,3), QUERIES.slice(3)]) {
    const results = await Promise.allSettled(batch.map(async (what) => {
      const p = new URLSearchParams({ app_id: id, app_key: key, results_per_page: 50, what, sort_by: 'date' });
      if (location?.trim()) p.set('where', location.trim());
      try {
        const res = await fetch(proxied(`${ADZUNA}?${p}`), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || []).map((j) => ({
          id: String(j.id || crypto.randomUUID()), title: j.title,
          company: j.company?.display_name || 'Unknown',
          location: j.location?.display_name || location || 'US',
          desc: stripHtml(j.description).slice(0, 300),
          link: j.redirect_url, pubDate: j.created,
          salary: j.salary_min ? `$${Math.round(j.salary_min/1000)}k – $${Math.round(j.salary_max/1000)}k` : null,
          source: 'Adzuna',
        }));
      } catch { return []; }
    }));
    all.push(...results.flatMap((r) => r.status === 'fulfilled' ? r.value : []));
    await new Promise((r) => setTimeout(r, 500));
  }
  return all;
}

async function devMuse() {
  const apiKey = getMuseKey(); if (!apiKey) return [];
  const cats = ['Software Engineer', 'Sales', 'IT', 'Project Management', 'Data', 'Customer Service'];
  const results = await Promise.allSettled(cats.map(async (category) => {
    const p = new URLSearchParams({ api_key: apiKey, category, page: 0, count: 20 });
    try {
      const res = await fetch(`${MUSE}?${p}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map((j) => ({
        id: String(j.id || crypto.randomUUID()), title: j.name,
        company: j.company?.name || 'Unknown',
        location: j.locations?.map((l) => l.name).join(', ') || 'US',
        desc: stripHtml(j.contents).slice(0, 300),
        link: j.refs?.landing_page || '', pubDate: j.publication_date,
        salary: null, source: 'The Muse',
      }));
    } catch { return []; }
  }));
  return results.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
}

async function devUSAJobs(location) {
  const apiKey = getUSAJobsKey(), userAgent = getUSAJobsEmail();
  if (!apiKey || !userAgent) return [];
  const queries = ['Software Engineer', 'IT Specialist', 'Program Manager'];
  const results = await Promise.allSettled(queries.map(async (Keyword) => {
    const p = new URLSearchParams({ Keyword, ResultsPerPage: 25, SortField: 'OpenDate', SortDirection: 'Desc' });
    if (location?.trim() && location.toLowerCase() !== 'remote') p.set('LocationName', location.trim());
    try {
      const res = await fetch(`${USAJOBS}?${p}`, { headers: { 'Authorization-Key': apiKey, 'User-Agent': userAgent, Host: 'data.usajobs.gov' }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.SearchResult?.SearchResultItems || []).map((item) => {
        const j = item.MatchedObjectDescriptor, rem = j.PositionRemuneration?.[0];
        return { id: j.PositionID, title: j.PositionTitle, company: j.OrganizationName, location: j.PositionLocationDisplay || 'US', desc: stripHtml(j.QualificationSummary || '').slice(0, 300), link: j.PositionURI, pubDate: j.PublicationStartDate, salary: rem ? `$${Math.round(rem.MinimumRange/1000)}k – $${Math.round(rem.MaximumRange/1000)}k` : null, source: 'USAJobs' };
      });
    } catch { return []; }
  }));
  return results.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
}

async function devRemoteOK() {
  try {
    const res = await fetch(proxied(REMOTEOK), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data.slice(1) : []).map((j) => ({
      id: String(j.id || crypto.randomUUID()), title: j.position || '',
      company: j.company || 'Unknown', location: 'Remote',
      desc: stripHtml(j.description || '').slice(0, 300),
      link: j.url || `https://remoteok.com/remote-jobs/${j.slug}`,
      pubDate: j.date, salary: j.salary || null,
      tags: (j.tags || []).map((t) => t.toLowerCase()), source: 'RemoteOK',
    }));
  } catch { return []; }
}

function dedupe(jobs) {
  const seen = new Set();
  return jobs.filter((j) => {
    if (!j.title || !j.link) return false;
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
    if (seen.has(key)) return false; seen.add(key); return true;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchJobs(location = '', bustCache = false) {
  const cacheKey = `${location}`;
  if (!bustCache && cache.jobs && cache.cacheKey === cacheKey) return cache.jobs;

  let jobs;
  if (API_URL) {
    jobs = await fetchViaBackend(location, bustCache);
  } else {
    const [az, mu, us, ro] = await Promise.all([devAdzuna(location), devMuse(), devUSAJobs(location), devRemoteOK()]);
    jobs = dedupe([...az, ...mu, ...us, ...ro]).sort((a, b) => new Date(b.pubDate||0) - new Date(a.pubDate||0));
  }

  cache.jobs = jobs; cache.cacheKey = cacheKey;
  return jobs;
}

export function getActiveSources() {
  if (API_URL) return ['Adzuna', 'The Muse', 'USAJobs', 'RemoteOK'];
  const s = ['RemoteOK'];
  if (getAdzunaId() && getAdzunaKey()) s.push('Adzuna');
  if (getMuseKey())                    s.push('The Muse');
  if (getUSAJobsKey())                 s.push('USAJobs');
  return s;
}

export function clearJobCache() { cache.jobs = null; cache.cacheKey = null; }
