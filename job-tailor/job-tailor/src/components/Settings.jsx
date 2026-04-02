import { useState, useEffect } from 'react';
import { getAnthropicKey, getAdzunaId, getAdzunaKey, getMuseKey, getUSAJobsKey, getUSAJobsEmail, saveSettings, getSettingsStatus } from '../services/settings.js';
import styles from './Settings.module.css';

const SOURCE_DOCS = {
  Anthropic: { url: 'https://console.anthropic.com',              label: 'console.anthropic.com' },
  Adzuna:    { url: 'https://developer.adzuna.com',               label: 'developer.adzuna.com' },
  'The Muse':{ url: 'https://www.themuse.com/developers/api/v2',  label: 'themuse.com/developers' },
  USAJobs:   { url: 'https://developer.usajobs.gov',              label: 'developer.usajobs.gov' },
};

function StatusDot({ active }) {
  return (
    <span
      className={styles.statusDot}
      style={{ background: active ? 'var(--success)' : 'var(--border)' }}
      title={active ? 'Configured' : 'Not configured'}
    />
  );
}

function KeyInput({ label, value, onChange, placeholder, type = 'password' }) {
  const [show, setShow] = useState(false);
  return (
    <div className={styles.keyField}>
      <label className={styles.keyLabel}>{label}</label>
      <div className={styles.keyInputRow}>
        <input
          className={styles.keyInput}
          type={show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
        />
        {type === 'password' && (
          <button className={styles.showBtn} onClick={() => setShow((s) => !s)} type="button">
            {show ? '🙈' : '👁'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Settings({ onToast }) {
  const [form, setForm] = useState({
    anthropic:    '',
    adzunaId:     '',
    adzunaKey:    '',
    muse:         '',
    usajobsKey:   '',
    usajobsEmail: '',
  });
  const [status, setStatus] = useState({});
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    setForm({
      anthropic:    getAnthropicKey(),
      adzunaId:     getAdzunaId(),
      adzunaKey:    getAdzunaKey(),
      muse:         getMuseKey(),
      usajobsKey:   getUSAJobsKey(),
      usajobsEmail: getUSAJobsEmail(),
    });
    setStatus(getSettingsStatus());
  }, []);

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setSaved(false);
  }

  function handleSave() {
    saveSettings(form);
    setStatus(getSettingsStatus());
    setSaved(true);
    onToast('Settings saved!');
    // Reload page so jobFeed re-reads keys
    setTimeout(() => window.location.reload(), 800);
  }

  return (
    <div className={styles.settings}>
      <div className={styles.intro}>
        <h2 className={styles.title}>API Keys</h2>
        <p className={styles.desc}>
          Your keys are stored locally in your browser and never sent anywhere except directly to each service.
          Only the Anthropic key is required — the job board sources are optional.
        </p>
      </div>

      {/* Status overview */}
      <div className={styles.statusGrid}>
        {[
          { name: 'Anthropic',  active: status.anthropic, required: true },
          { name: 'Adzuna',     active: status.adzuna,    required: false },
          { name: 'The Muse',   active: status.muse,      required: false },
          { name: 'USAJobs',    active: status.usajobs,   required: false },
        ].map((s) => (
          <div key={s.name} className={styles.statusCard}>
            <StatusDot active={s.active} />
            <span className={styles.statusName}>{s.name}</span>
            {s.required && <span className={styles.requiredBadge}>required</span>}
            {!s.required && s.active && <span className={styles.activeBadge}>active</span>}
            <a
              href={SOURCE_DOCS[s.name]?.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.docsLink}
            >
              Get key ↗
            </a>
          </div>
        ))}
      </div>

      {/* Anthropic */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <StatusDot active={status.anthropic} />
          <h3 className={styles.sectionTitle}>Anthropic</h3>
          <span className={styles.requiredBadge}>Required</span>
          <a href={SOURCE_DOCS.Anthropic.url} target="_blank" rel="noopener noreferrer" className={styles.docsLink}>
            Get key ↗
          </a>
        </div>
        <p className={styles.sectionDesc}>Powers resume tailoring, JD analysis, and cover letter generation.</p>
        <KeyInput
          label="API Key"
          value={form.anthropic}
          onChange={(v) => set('anthropic', v)}
          placeholder="sk-ant-..."
        />
      </div>

      {/* Adzuna */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <StatusDot active={status.adzuna} />
          <h3 className={styles.sectionTitle}>Adzuna</h3>
          <span className={styles.optionalBadge}>Optional</span>
          <a href={SOURCE_DOCS.Adzuna.url} target="_blank" rel="noopener noreferrer" className={styles.docsLink}>
            Get key ↗
          </a>
        </div>
        <p className={styles.sectionDesc}>Broad US job listings across all industries. Free tier: 250 req/month.</p>
        <KeyInput label="App ID"  value={form.adzunaId}  onChange={(v) => set('adzunaId', v)}  placeholder="your-app-id" />
        <KeyInput label="App Key" value={form.adzunaKey} onChange={(v) => set('adzunaKey', v)} placeholder="your-app-key" />
      </div>

      {/* The Muse */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <StatusDot active={status.muse} />
          <h3 className={styles.sectionTitle}>The Muse</h3>
          <span className={styles.optionalBadge}>Optional</span>
          <a href={SOURCE_DOCS['The Muse'].url} target="_blank" rel="noopener noreferrer" className={styles.docsLink}>
            Get key ↗
          </a>
        </div>
        <p className={styles.sectionDesc}>Tech and startup job listings with company culture info. Free.</p>
        <KeyInput label="API Key" value={form.muse} onChange={(v) => set('muse', v)} placeholder="your-muse-api-key" />
      </div>

      {/* USAJobs */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <StatusDot active={status.usajobs} />
          <h3 className={styles.sectionTitle}>USAJobs</h3>
          <span className={styles.optionalBadge}>Optional</span>
          <a href={SOURCE_DOCS.USAJobs.url} target="_blank" rel="noopener noreferrer" className={styles.docsLink}>
            Get key ↗
          </a>
        </div>
        <p className={styles.sectionDesc}>
          Federal government jobs. Great fit given your military background and lapsed Top Secret clearance.
          Free — approval takes ~1 business day.
        </p>
        <KeyInput label="API Key" value={form.usajobsKey}   onChange={(v) => set('usajobsKey', v)}   placeholder="your-usajobs-api-key" />
        <KeyInput label="Email (used as User-Agent)" value={form.usajobsEmail} onChange={(v) => set('usajobsEmail', v)} placeholder="you@email.com" type="email" />
      </div>

      <div className={styles.footer}>
        <button className="btn-primary" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
        <p className={styles.privacyNote}>
          🔒 Keys are stored only in your browser's localStorage. They are never transmitted to any third party.
        </p>
      </div>
    </div>
  );
}
