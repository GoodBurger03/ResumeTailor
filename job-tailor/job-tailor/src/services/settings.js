/**
 * Settings service — manages user-provided API keys.
 *
 * Keys are stored in localStorage so users only need to enter them once.
 * Falls back to Vite .env variables if localStorage key is not set.
 * This lets developers still use .env while end users use the Settings UI.
 */

const KEYS = {
  ANTHROPIC:        'jobtailor_key_anthropic',
  ADZUNA_APP_ID:    'jobtailor_key_adzuna_id',
  ADZUNA_APP_KEY:   'jobtailor_key_adzuna_key',
  MUSE:             'jobtailor_key_muse',
  USAJOBS_KEY:      'jobtailor_key_usajobs',
  USAJOBS_EMAIL:    'jobtailor_key_usajobs_email',
};

const STORAGE_SECRET = import.meta.env.VITE_STORAGE_ENCRYPTION_SECRET || '';

function xorCipher(value, key) {
  if (!key) return value;
  const keyLen = key.length;
  return Array.from(value).map((char, idx) => {
    const c = char.charCodeAt(0) ^ key.charCodeAt(idx % keyLen);
    return String.fromCharCode(c);
  }).join('');
}

function encode(value) {
  if (!value) return value;
  if (!STORAGE_SECRET) return value;
  return btoa(xorCipher(value, STORAGE_SECRET));
}

function decode(value) {
  if (!value) return value;
  if (!STORAGE_SECRET) return value;
  try {
    return xorCipher(atob(value), STORAGE_SECRET);
  } catch {
    return '';
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

export function getAnthropicKey() {
  return get(KEYS.ANTHROPIC, 'VITE_ANTHROPIC_API_KEY');
}

export function getAdzunaId() {
  return get(KEYS.ADZUNA_APP_ID, 'VITE_ADZUNA_APP_ID');
}

export function getAdzunaKey() {
  return get(KEYS.ADZUNA_APP_KEY, 'VITE_ADZUNA_APP_KEY');
}

export function getMuseKey() {
  return get(KEYS.MUSE, 'VITE_MUSE_API_KEY');
}

export function getUSAJobsKey() {
  return get(KEYS.USAJOBS_KEY, 'VITE_USAJOBS_API_KEY');
}

export function getUSAJobsEmail() {
  return get(KEYS.USAJOBS_EMAIL, 'VITE_USAJOBS_USER_AGENT');
}

// ─── Save all at once ─────────────────────────────────────────────────────────

export function saveSettings({ anthropic, adzunaId, adzunaKey, muse, usajobsKey, usajobsEmail }) {
  set(KEYS.ANTHROPIC,     anthropic);
  set(KEYS.ADZUNA_APP_ID, adzunaId);
  set(KEYS.ADZUNA_APP_KEY,adzunaKey);
  set(KEYS.MUSE,          muse);
  set(KEYS.USAJOBS_KEY,   usajobsKey);
  set(KEYS.USAJOBS_EMAIL, usajobsEmail);
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export function getSettingsStatus() {
  return {
    anthropic: !!getAnthropicKey(),
    adzuna:    !!(getAdzunaId() && getAdzunaKey()),
    muse:      !!getMuseKey(),
    usajobs:   !!(getUSAJobsKey() && getUSAJobsEmail()),
  };
}

export function hasRequiredKeys() {
  return !!getAnthropicKey();
}
