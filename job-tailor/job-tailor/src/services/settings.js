/**
 * Settings service — manages user-provided API keys.
 *
 * Storage: localStorage with base64 obfuscation.
 * Keys from .env are used as-is (dev). Keys from Settings UI are encoded.
 *
 * IMPORTANT: If you previously had keys saved with the old XOR cipher,
 * they will be auto-cleared on first load and you will need to re-enter them.
 */

const KEYS = {
  ANTHROPIC:     'jobtailor_key_anthropic',
  ADZUNA_APP_ID: 'jobtailor_key_adzuna_id',
  ADZUNA_APP_KEY:'jobtailor_key_adzuna_key',
  MUSE:          'jobtailor_key_muse',
  USAJOBS_KEY:   'jobtailor_key_usajobs',
  USAJOBS_EMAIL: 'jobtailor_key_usajobs_email',
  MIGRATION_DONE:'jobtailor_migrated_v2',
};

// ─── One-time migration: clear any XOR-corrupted keys from old versions ───────
function runMigration() {
  if (localStorage.getItem(KEYS.MIGRATION_DONE)) return;
  // Clear all jobtailor keys except the migration flag itself
  Object.values(KEYS).forEach((k) => {
    if (k !== KEYS.MIGRATION_DONE) localStorage.removeItem(k);
  });
  localStorage.setItem(KEYS.MIGRATION_DONE, '1');
}
runMigration();

// ─── Encode/decode ────────────────────────────────────────────────────────────

function encode(value) {
  if (!value) return '';
  try { return btoa(unescape(encodeURIComponent(value))); } catch { return value; }
}

function decode(raw) {
  if (!raw) return '';
  try {
    const decoded = decodeURIComponent(escape(atob(raw)));
    // Sanity check: decoded value should be printable ASCII / reasonable length
    if (decoded.length > 0 && decoded.length < 500) return decoded;
    return '';
  } catch {
    // Not base64 — might be a plain value from .env fallback path, return as-is
    return raw;
  }
}

function get(storageKey, envKey) {
  const stored = localStorage.getItem(storageKey);
  if (stored) return decode(stored);
  return import.meta.env[envKey] || '';
}

function set(storageKey, value) {
  if (value && value.trim()) {
    localStorage.setItem(storageKey, encode(value.trim()));
  } else {
    localStorage.removeItem(storageKey);
  }
}

// ─── Getters ──────────────────────────────────────────────────────────────────

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
