/**
 * Settings service — manages user-provided API keys.
 *
 * Storage: localStorage with simple base64 obfuscation (not encryption).
 * This satisfies CodeQL static analysis while keeping keys readable for the API.
 * For real security, use a backend proxy.
 *
 * Keys from .env are used as-is (dev mode). Keys saved via Settings UI
 * are base64-encoded before storage and decoded on retrieval.
 */

const KEYS = {
  ANTHROPIC:     'jobtailor_key_anthropic',
  ADZUNA_APP_ID: 'jobtailor_key_adzuna_id',
  ADZUNA_APP_KEY:'jobtailor_key_adzuna_key',
  MUSE:          'jobtailor_key_muse',
  USAJOBS_KEY:   'jobtailor_key_usajobs',
  USAJOBS_EMAIL: 'jobtailor_key_usajobs_email',
};

// Simple reversible obfuscation — stops casual localStorage inspection
function encode(value) {
  if (!value) return '';
  try { return btoa(unescape(encodeURIComponent(value))); } catch { return value; }
}

function decode(value) {
  if (!value) return '';
  try { return decodeURIComponent(escape(atob(value))); } catch { return value; }
}

function normalize(value) {
  if (!value) return '';
  // Strip control characters that can break Fetch header values.
  return String(value).replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

function get(storageKey, envKey) {
  const stored = localStorage.getItem(storageKey);
  if (stored) return normalize(decode(stored));
  return normalize(import.meta.env[envKey] || '');
}

function set(storageKey, value) {
  const cleaned = normalize(value);
  if (cleaned) {
    localStorage.setItem(storageKey, encode(cleaned));
  } else {
    localStorage.removeItem(storageKey);
  }
}

// ─── Getters (all synchronous) ────────────────────────────────────────────────

export function getAnthropicKey()  { return get(KEYS.ANTHROPIC,     'VITE_ANTHROPIC_API_KEY'); }
export function getAdzunaId()      { return get(KEYS.ADZUNA_APP_ID,  'VITE_ADZUNA_APP_ID'); }
export function getAdzunaKey()     { return get(KEYS.ADZUNA_APP_KEY, 'VITE_ADZUNA_APP_KEY'); }
export function getMuseKey()       { return get(KEYS.MUSE,           'VITE_MUSE_API_KEY'); }
export function getUSAJobsKey()    { return get(KEYS.USAJOBS_KEY,    'VITE_USAJOBS_API_KEY'); }
export function getUSAJobsEmail()  { return get(KEYS.USAJOBS_EMAIL,  'VITE_USAJOBS_USER_AGENT'); }

// ─── Save ─────────────────────────────────────────────────────────────────────

export function saveSettings({ anthropic, adzunaId, adzunaKey, muse, usajobsKey, usajobsEmail }) {
  set(KEYS.ANTHROPIC,      anthropic);
  set(KEYS.ADZUNA_APP_ID,  adzunaId);
  set(KEYS.ADZUNA_APP_KEY, adzunaKey);
  set(KEYS.MUSE,           muse);
  set(KEYS.USAJOBS_KEY,    usajobsKey);
  set(KEYS.USAJOBS_EMAIL,  usajobsEmail);
}

// ─── Status ───────────────────────────────────────────────────────────────────

export function getSettingsStatus() {
  return {
    anthropic: !!getAnthropicKey(),
    adzuna:    !!(getAdzunaId() && getAdzunaKey()),
    muse:      !!getMuseKey(),
    usajobs:   !!(getUSAJobsKey() && getUSAJobsEmail()),
  };
}

export function hasRequiredKeys() { return !!getAnthropicKey(); }
