import { useState, useEffect } from 'react';
import { generateInterviewPrep } from '../services/analysis.js';
import { getActiveResumeContent } from '../services/storage.js';
import styles from './InterviewPrep.module.css';

const CATEGORY_COLORS = {
  Behavioral:    { bg: 'rgba(232,255,71,0.1)',  color: '#e8ff47' },
  Technical:     { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
  Situational:   { bg: 'rgba(251,146,60,0.12)', color: '#fb923c' },
  'Role-Specific':{ bg: 'rgba(74,222,128,0.12)',color: '#4ade80' },
  Culture:       { bg: 'rgba(248,113,113,0.12)',color: '#f87171' },
};

function QuestionCard({ q, index }) {
  const [open, setOpen] = useState(false);
  const clr = CATEGORY_COLORS[q.category] || CATEGORY_COLORS.Behavioral;

  return (
    <div className={styles.qCard}>
      <div className={styles.qHeader} onClick={() => setOpen((o) => !o)}>
        <div className={styles.qLeft}>
          <span className={styles.qNum}>{String(index + 1).padStart(2, '0')}</span>
          <span className={styles.qCategory} style={{ background: clr.bg, color: clr.color }}>
            {q.category}
          </span>
          <span className={styles.qText}>{q.question}</span>
        </div>
        <span className={styles.qChevron}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className={styles.qBody}>
          {q.resumeAnchor && (
            <div className={styles.anchor}>
              <span className={styles.anchorLabel}>📌 Reference:</span> {q.resumeAnchor}
            </div>
          )}
          <div className={styles.talkingPoints}>
            <div className={styles.tpLabel}>Talking Points</div>
            <ul>
              {q.talkingPoints.map((tp, i) => (
                <li key={i} className={styles.tp}>→ {tp}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InterviewPrep({ onToast }) {
  const [resume, setResume]   = useState('');
  const [jd, setJd]           = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('All');

  useEffect(() => {
    const saved = getActiveResumeContent();
    if (saved) setResume(saved);
  }, []);

  async function handleGenerate() {
    if (!resume.trim() || !jd.trim()) {
      setError('Please paste both your resume and the job description.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const data = await generateInterviewPrep(resume, jd);
      setResult(data);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const categories = result ? ['All', ...new Set(result.questions.map((q) => q.category))] : [];
  const visible = result?.questions.filter((q) => filter === 'All' || q.category === filter) || [];

  return (
    <div>
      <div className="grid-2">
        <div className="card">
          <div className="card-label">Your Resume</div>
          <textarea className="textarea" placeholder="Paste your resume here..." value={resume} onChange={(e) => setResume(e.target.value)} />
        </div>
        <div className="card">
          <div className="card-label">Job Description</div>
          <textarea className="textarea" placeholder="Paste the job description here..." value={jd} onChange={(e) => setJd(e.target.value)} />
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className="btn-row">
        <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading && <span className="spinner" />}
          <span>{loading ? 'Preparing questions…' : '🎯 Generate Interview Prep'}</span>
        </button>
      </div>

      {loading && (
        <div>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8 }} />)}
        </div>
      )}

      {result && (
        <div className={styles.results}>
          {/* Key themes */}
          <div className={styles.themesRow}>
            <span className={styles.themesLabel}>Key themes:</span>
            {result.keyThemes?.map((t) => (
              <span key={t} className={styles.themePill}>{t}</span>
            ))}
          </div>

          {/* Red flags */}
          {result.redFlags?.length > 0 && (
            <div className={styles.redFlags}>
              <span className={styles.rfLabel}>⚠ Prepare for:</span>
              {result.redFlags.map((r) => <span key={r} className={styles.rfPill}>{r}</span>)}
            </div>
          )}

          {/* Category filter */}
          <div className={styles.filterRow}>
            {categories.map((c) => (
              <button
                key={c}
                className={`${styles.filterBtn} ${filter === c ? styles.filterActive : ''}`}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Questions */}
          <div className={styles.questions}>
            {visible.map((q, i) => <QuestionCard key={i} q={q} index={result.questions.indexOf(q)} />)}
          </div>

          <p className={styles.tip}>💡 Click each question to reveal talking points from your resume.</p>
        </div>
      )}
    </div>
  );
}
