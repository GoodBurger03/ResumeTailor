/**
 * localStorage-backed persistence for job applications.
 * Each application: { id, company, role, location, url, status, matchScore, notes, appliedAt, updatedAt }
 * Statuses: 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'
 */

const KEY = 'jobtailor_applications';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function writeAll(apps) {
  localStorage.setItem(KEY, JSON.stringify(apps));
}

export function getApplications() {
  return readAll();
}

export function addApplication(app) {
  const apps = readAll();
  const newApp = {
    id: crypto.randomUUID(),
    company: '',
    role: '',
    location: '',
    url: '',
    status: 'saved',
    matchScore: null,
    notes: '',
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...app,
  };
  apps.unshift(newApp);
  writeAll(apps);
  return newApp;
}

export function updateApplication(id, changes) {
  const apps = readAll().map((a) =>
    a.id === id ? { ...a, ...changes, updatedAt: new Date().toISOString() } : a
  );
  writeAll(apps);
  return apps.find((a) => a.id === id);
}

export function deleteApplication(id) {
  writeAll(readAll().filter((a) => a.id !== id));
}

export function getStats() {
  const apps = readAll();
  const total = apps.length;
  const byStatus = apps.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});
  const scored = apps.filter((a) => a.matchScore !== null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, a) => s + a.matchScore, 0) / scored.length)
    : null;
  const responseRate = total
    ? Math.round(((byStatus.interview || 0) + (byStatus.offer || 0)) / total * 100)
    : 0;

  // Apps per week over last 8 weeks
  const now = Date.now();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = now - (8 - i) * 7 * 86400000;
    const end   = now - (7 - i) * 7 * 86400000;
    return {
      label: new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: apps.filter((a) => {
        const t = new Date(a.appliedAt).getTime();
        return t >= start && t < end;
      }).length,
    };
  });

  return { total, byStatus, avgScore, responseRate, weeks };
}

// ─── Resume persistence ───────────────────────────────────────────────────────

const RESUME_KEY = 'jobtailor_saved_resume';

export function getSavedResume() {
  return localStorage.getItem(RESUME_KEY) || '';
}

export function saveResume(text) {
  localStorage.setItem(RESUME_KEY, text);
}

export function clearResume() {
  localStorage.removeItem(RESUME_KEY);
}

// ─── Resume Version Manager ───────────────────────────────────────────────────

const RESUME_VERSIONS_KEY = 'jobtailor_resume_versions';
const ACTIVE_RESUME_KEY   = 'jobtailor_active_resume_id';

export function getResumeVersions() {
  try { return JSON.parse(localStorage.getItem(RESUME_VERSIONS_KEY) || '[]'); }
  catch { return []; }
}

export function saveResumeVersion({ id, name, content }) {
  const versions = getResumeVersions();
  const existing = versions.findIndex((v) => v.id === id);
  const version  = { id: id || crypto.randomUUID(), name, content, updatedAt: new Date().toISOString() };
  if (existing >= 0) { versions[existing] = version; }
  else { versions.unshift(version); }
  localStorage.setItem(RESUME_VERSIONS_KEY, JSON.stringify(versions));
  return version;
}

export function deleteResumeVersion(id) {
  const versions = getResumeVersions().filter((v) => v.id !== id);
  localStorage.setItem(RESUME_VERSIONS_KEY, JSON.stringify(versions));
  if (getActiveResumeId() === id) clearActiveResume();
}

export function getActiveResumeId() {
  return localStorage.getItem(ACTIVE_RESUME_KEY) || null;
}

export function setActiveResume(id) {
  localStorage.setItem(ACTIVE_RESUME_KEY, id);
}

export function clearActiveResume() {
  localStorage.removeItem(ACTIVE_RESUME_KEY);
}

export function getActiveResumeContent() {
  const id = getActiveResumeId();
  if (!id) return getSavedResume(); // fall back to single saved resume
  const version = getResumeVersions().find((v) => v.id === id);
  return version?.content || getSavedResume();
}
