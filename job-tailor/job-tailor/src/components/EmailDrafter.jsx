import { useState } from 'react';
import { generateFollowUpEmail, EMAIL_SCENARIOS } from '../services/analysis.js';
import styles from './EmailDrafter.module.css';

export default function EmailDrafter({ onToast }) {
  const [scenario, setScenario] = useState('afterApply');
  const [context, setContext]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [email, setEmail]       = useState('');
  const [error, setError]       = useState('');

  const cfg = EMAIL_SCENARIOS[scenario];

  const CONTEXT_PLACEHOLDERS = {
    afterApply:     'Company: Acme Corp\nRole: Software Engineer\nApplied: 1 week ago\nAny notes about why you are excited about this role...',
    afterInterview: 'Company: Acme Corp\nRole: Software Engineer\nInterviewer: Sarah Chen\nTopics discussed: System design, Kubernetes experience, team culture\nYour strongest moment: Described OHIP integration project...',
    checkIn:        'Company: Acme Corp\nRole: Software Engineer\nLast contact: 2 weeks ago after interview\nAny context about the role or company...',
    afterRejection: 'Company: Acme Corp\nRole: Software Engineer\nDate of rejection email: today\nAny positive aspects of the process to mention...',
  };

  async function handleGenerate() {
    if (!context.trim()) { setError('Please add some context about the role and company.'); return; }
    setError('');
    setLoading(true);
    setEmail('');
    try {
      const text = await generateFollowUpEmail(scenario, context);
      setEmail(text);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(email);
    onToast('Email copied!');
  }

  return (
    <div>
      {/* Scenario selector */}
      <div className={styles.scenarioGrid}>
        {Object.entries(EMAIL_SCENARIOS).map(([key, s]) => (
          <button
            key={key}
            className={`${styles.scenarioCard} ${scenario === key ? styles.scenarioActive : ''}`}
            onClick={() => { setScenario(key); setEmail(''); }}
          >
            <span className={styles.scenarioEmoji}>{s.emoji}</span>
            <span className={styles.scenarioLabel}>{s.label}</span>
            <span className={styles.scenarioDesc}>{s.description}</span>
          </button>
        ))}
      </div>

      {/* Context input */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-label">Context</div>
        <p className={styles.contextHint}>Tell the AI about the role, company, and any relevant details.</p>
        <textarea
          className="textarea"
          style={{ minHeight: 140 }}
          placeholder={CONTEXT_PLACEHOLDERS[scenario]}
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className="btn-row">
        <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading && <span className="spinner" />}
          <span>{loading ? 'Writing…' : `${cfg.emoji} Draft ${cfg.label} Email`}</span>
        </button>
      </div>

      {loading && (
        <div className="skeleton" style={{ height: 160, marginTop: 8 }} />
      )}

      {email && (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2 className={styles.resultsTitle}>Email Draft</h2>
            <span className={styles.scenarioPill}>{cfg.emoji} {cfg.label}</span>
          </div>
          <div className={styles.emailOutput}>{email}</div>
          <div className={styles.emailActions}>
            <button className="btn-secondary" onClick={handleCopy}>⎘ Copy to clipboard</button>
            <button className="btn-secondary" onClick={() => setEmail('')}>↺ Regenerate</button>
          </div>
          <p className={styles.tip}>Remember to fill in any bracketed placeholders like [Hiring Manager] before sending.</p>
        </div>
      )}
    </div>
  );
}
