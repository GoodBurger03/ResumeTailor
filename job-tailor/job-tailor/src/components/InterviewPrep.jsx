import { useState, useEffect } from 'react';
import { generateInterviewPrep } from '../services/analysis.js';
import { getActiveResumeContent } from '../services/storage.js';
import styles from './InterviewPrep.module.css';

const CATEGORY_COLORS = {
  Behavioral:      { bg: 'rgba(232,255,71,0.1)',  color: '#e8ff47' },
  Technical:       { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
  Situational:     { bg: 'rgba(251,146,60,0.12)', color: '#fb923c' },
  'Role-Specific': { bg: 'rgba(74,222,128,0.12)', color: '#4ade80' },
  Culture:         { bg: 'rgba(248,113,113,0.12)',color: '#f87171' },
};

function QuestionCard({ q, index }) {
  const [open, setOpen]         = useState(false);
  const [practiced, setPracticed] = useState(false);
  const [note, setNote]         = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const clr = CATEGORY_COLORS[q.category] || CATEGORY_COLORS.Behavioral;

  return (
    <div className={`${styles.qCard} ${practiced ? styles.qPracticed : ''}`}>
      <div className={styles.qHeader} onClick={() => setOpen((o) => !o)}>
        <div className={styles.qLeft}>
          <span className={styles.qNum}>{String(index + 1).padStart(2, '0')}</span>
          <span className={styles.qCategory} style={{ background: clr.bg, color: clr.color }}>{q.category}</span>
          <span className={styles.qText}>{q.question}</span>
        </div>
        <div className={styles.qRight} onClick={(e) => e.stopPropagation()}>
          <button
            className={`${styles.practicedBtn} ${practiced ? styles.practicedActive : ''}`}
            onClick={() => setPracticed((p) => !p)}
            title={practiced ? 'Mark as not practiced' : 'Mark as practiced'}
          >
            {practiced ? '✓ Practiced' : 'Practice'}
          </button>
          <span className={styles.qChevron}>{open ? '▲' : '▼'}</span>
        </div>
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
            <ul>{q.talkingPoints.map((tp, i) => <li key={i} className={styles.tp}>→ {tp}</li>)}</ul>
          </div>

          {/* Personal notes */}
          <div className={styles.noteSection}>
            <div className={styles.tpLabel}>My Notes</div>
            {editingNote ? (
              <div>
                <textarea
                  className={styles.noteInput}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add your own notes, personal examples, reminders…"
                  rows={3}
                />
                <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px', marginTop: 6 }} onClick={() => setEditingNote(false)}>Done</button>
              </div>
            ) : (
              <div className={styles.noteTrigger} onClick={() => setEditingNote(true)}>
                {note ? <span className={styles.noteText}>{note}</span> : <span className={styles.notePlaceholder}>+ Add personal notes or examples</span>}
              </div>
            )}
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
    if (!resume.trim() || !jd.trim()) { setError('Please paste both your resume and the job description.'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const data = await generateInterviewPrep(resume, jd);
      setResult(data);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  }

  function handleExport() {
    if (!result) return;
    const text = result.questions.map((q, i) =>
      `${i + 1}. [${q.category}] ${q.question}\n   Ref: ${q.resumeAnchor}\n   Points: ${q.talkingPoints.join(' | ')}`
    ).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'interview-prep.txt' });
    a.click();
    onToast('Exported!');
  }

  const categories = result ? ['All', ...new Set(result.questions.map((q) => q.category))] : [];
  const visible    = result?.questions.filter((q) => filter === 'All' || q.category === filter) || [];

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
        {result && <button className="btn-secondary" onClick={handleExport}>↓ Export as .txt</button>}
      </div>

      {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8 }} />)}

      {result && (
        <div className={styles.results}>
          <div className={styles.themesRow}>
            <span className={styles.themesLabel}>Key themes:</span>
            {result.keyThemes?.map((t) => <span key={t} className={styles.themePill}>{t}</span>)}
          </div>

          {result.redFlags?.length > 0 && (
            <div className={styles.redFlags}>
              <span className={styles.rfLabel}>⚠ Prepare for:</span>
              {result.redFlags.map((r) => <span key={r} className={styles.rfPill}>{r}</span>)}
            </div>
          )}

          <div className={styles.filterRow}>
            {categories.map((c) => (
              <button key={c} className={`${styles.filterBtn} ${filter === c ? styles.filterActive : ''}`} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>

          <div className={styles.questions}>
            {visible.map((q, i) => <QuestionCard key={i} q={q} index={result.questions.indexOf(q)} />)}
          </div>

          <p className={styles.tip}>💡 Click each question to reveal talking points. Mark questions as practiced to track your progress.</p>
        </div>
      )}
    </div>
  );
}
