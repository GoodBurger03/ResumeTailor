import { useState } from 'react';
import { generateFollowUpEmail, EMAIL_SCENARIOS } from '../services/analysis.js';
import styles from './EmailDrafter.module.css';

const FIELDS = {
  afterApply:     ['company', 'role', 'daysAgo', 'notes'],
  afterInterview: ['company', 'role', 'interviewer', 'topics', 'notes'],
  checkIn:        ['company', 'role', 'weeksAgo', 'notes'],
  afterRejection: ['company', 'role', 'notes'],
};

const FIELD_CONFIG = {
  company:     { label: 'Company',             placeholder: 'Acme Corp' },
  role:        { label: 'Role',                placeholder: 'Software Engineer' },
  interviewer: { label: 'Interviewer name',    placeholder: 'Sarah Chen' },
  topics:      { label: 'Topics discussed',    placeholder: 'System design, Kubernetes, team culture' },
  daysAgo:     { label: 'Days since applying', placeholder: '7', type: 'number' },
  weeksAgo:    { label: 'Weeks since last contact', placeholder: '2', type: 'number' },
  notes:       { label: 'Any additional context', placeholder: 'What excited you about this role…' },
};

function buildContext(scenario, form) {
  const parts = [];
  if (form.company)     parts.push(`Company: ${form.company}`);
  if (form.role)        parts.push(`Role: ${form.role}`);
  if (form.interviewer) parts.push(`Interviewer: ${form.interviewer}`);
  if (form.topics)      parts.push(`Topics discussed: ${form.topics}`);
  if (form.daysAgo)     parts.push(`Applied ${form.daysAgo} days ago`);
  if (form.weeksAgo)    parts.push(`Last contact was ${form.weeksAgo} weeks ago`);
  if (form.notes)       parts.push(`Notes: ${form.notes}`);
  return parts.join('\n');
}

export default function EmailDrafter({ onToast }) {
  const [scenario, setScenario] = useState('afterApply');
  const [form, setForm]         = useState({});
  const [loading, setLoading]   = useState(false);
  const [email, setEmail]       = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [isEditing, setIsEditing]     = useState(false);
  const [error, setError]       = useState('');

  const cfg    = EMAIL_SCENARIOS[scenario];
  const fields = FIELDS[scenario] || [];

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function switchScenario(s) { setScenario(s); setEmail(''); setEditedEmail(''); setForm({}); }

  async function handleGenerate() {
    const context = buildContext(scenario, form);
    if (!context.trim()) { setError('Please fill in at least the company and role.'); return; }
    setError(''); setLoading(true); setEmail(''); setEditedEmail('');
    try {
      const text = await generateFollowUpEmail(scenario, context);
      setEmail(text);
      setEditedEmail(text);
      setIsEditing(false);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  }

  function handleCopy() {
    navigator.clipboard.writeText(isEditing ? editedEmail : email);
    onToast('Email copied!');
  }

  return (
    <div>
      {/* Scenario picker */}
      <div className={styles.scenarioGrid}>
        {Object.entries(EMAIL_SCENARIOS).map(([key, s]) => (
          <button
            key={key}
            className={`${styles.scenarioCard} ${scenario === key ? styles.scenarioActive : ''}`}
            onClick={() => switchScenario(key)}
          >
            <span className={styles.scenarioEmoji}>{s.emoji}</span>
            <span className={styles.scenarioLabel}>{s.label}</span>
            <span className={styles.scenarioDesc}>{s.description}</span>
          </button>
        ))}
      </div>

      {/* Structured fields */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-label" style={{ marginBottom: 14 }}>Details</div>
        <div className={styles.fieldsGrid}>
          {fields.map((key) => {
            const fc = FIELD_CONFIG[key];
            return (
              <div key={key} className={key === 'notes' || key === 'topics' ? styles.fieldFull : styles.field}>
                <label className={styles.fieldLabel}>{fc.label}</label>
                {key === 'notes' || key === 'topics' ? (
                  <textarea
                    className={styles.fieldTextarea}
                    placeholder={fc.placeholder}
                    value={form[key] || ''}
                    onChange={(e) => setField(key, e.target.value)}
                    rows={2}
                  />
                ) : (
                  <input
                    className={styles.fieldInput}
                    type={fc.type || 'text'}
                    placeholder={fc.placeholder}
                    value={form[key] || ''}
                    onChange={(e) => setField(key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className="btn-row">
        <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading && <span className="spinner" />}
          <span>{loading ? 'Writing…' : `${cfg.emoji} Draft ${cfg.label} Email`}</span>
        </button>
      </div>

      {loading && <div className="skeleton" style={{ height: 160, marginTop: 8 }} />}

      {email && (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2 className={styles.resultsTitle}>Email Draft</h2>
            <span className={styles.scenarioPill}>{cfg.emoji} {cfg.label}</span>
          </div>

          {/* Editable output */}
          {isEditing ? (
            <textarea
              className={styles.emailEditable}
              value={editedEmail}
              onChange={(e) => setEditedEmail(e.target.value)}
              rows={12}
            />
          ) : (
            <div className={styles.emailOutput}>{editedEmail || email}</div>
          )}

          <div className={styles.emailActions}>
            <button className="btn-secondary" onClick={handleCopy}>⎘ Copy</button>
            <button className="btn-secondary" onClick={() => setIsEditing((e) => !e)}>
              {isEditing ? '✓ Done editing' : '✏ Edit inline'}
            </button>
            <button className="btn-secondary" onClick={handleGenerate}>↺ Regenerate</button>
          </div>
          <p className={styles.tip}>Fill in any [bracketed] placeholders before sending.</p>
        </div>
      )}
    </div>
  );
}
