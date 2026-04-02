import { useState, useEffect } from 'react';
import { tailorResume } from '../services/analysis.js';
import { exportToPDF, exportToDOCX } from '../services/export.js';
import { getSavedResume, saveResume, clearResume } from '../services/storage.js';
import ScoreRing from './ScoreRing.jsx';
import styles from './ResumeTailor.module.css';

function scoreBadgeClass(score) {
  if (score >= 75) return 'badge badge-green';
  if (score >= 50) return 'badge badge-orange';
  return 'badge badge-red';
}

function scoreBadgeLabel(score) {
  if (score >= 75) return 'Strong Match';
  if (score >= 50) return 'Moderate Match';
  return 'Low Match';
}

function SkillPill({ label, type }) {
  const dotClass = type === 'strong' ? styles.dotGreen : styles.dotRed;
  return (
    <div className={styles.skillPill}>
      <span className={`${styles.dot} ${dotClass}`} />
      {label}
    </div>
  );
}

function BulletItem({ text, onCopy }) {
  return (
    <li className={styles.bulletItem} onClick={() => onCopy(text)}>
      <span className={styles.arrow}>→</span>
      <span>{text}</span>
      <span className={styles.copyHint}>click to copy</span>
    </li>
  );
}

export default function ResumeTailor({ onToast, prefillJD }) {
  const [resume, setResume]       = useState('');
  const [jd, setJd]               = useState('');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const [exporting, setExporting] = useState('');
  const [resumeSaved, setResumeSaved] = useState(false);

  // Load saved resume on mount
  useEffect(() => {
    const saved = getSavedResume();
    if (saved) {
      setResume(saved);
      setResumeSaved(true);
    }
  }, []);

  // Prefill JD from Job Board
  useEffect(() => {
    if (!prefillJD) return;
    const text = [
      prefillJD.title   && `Role: ${prefillJD.title}`,
      prefillJD.company && `Company: ${prefillJD.company}`,
      prefillJD.desc,
    ].filter(Boolean).join('\n\n');
    setJd(text);
    setResult(null);
  }, [prefillJD]);

  function handleResumeChange(val) {
    setResume(val);
    setResumeSaved(false);
  }

  function handleSaveResume() {
    if (!resume.trim()) return;
    saveResume(resume);
    setResumeSaved(true);
    onToast('Resume saved!');
  }

  function handleClearResume() {
    clearResume();
    setResume('');
    setResumeSaved(false);
    onToast('Resume cleared.');
  }

  async function handleAnalyze() {
    if (!resume.trim() || !jd.trim()) {
      setError('Please paste both your resume and the job description.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const data = await tailorResume(resume, jd);
      setResult(data);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text);
    onToast('Copied!');
  }

  async function handleExportPDF() {
    setExporting('pdf');
    try {
      await exportToPDF({ name: 'Joshua Bartels', bullets: result.tailoredBullets });
      onToast('PDF downloaded!');
    } catch { onToast('Export failed.'); }
    finally { setExporting(''); }
  }

  async function handleExportDOCX() {
    setExporting('docx');
    try {
      await exportToDOCX({ name: 'Joshua Bartels', bullets: result.tailoredBullets });
      onToast('.docx downloaded!');
    } catch { onToast('Export failed.'); }
    finally { setExporting(''); }
  }

  return (
    <div>
      {prefillJD && (
        <div className={styles.prefillBanner}>
          ✦ Job loaded: <strong>{prefillJD.title}</strong>
          {prefillJD.company ? ` at ${prefillJD.company}` : ''} — hit Analyze to tailor your resume.
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className={styles.cardHeader}>
            <div className="card-label">Your Resume</div>
            <div className={styles.resumeActions}>
              {resumeSaved && (
                <span className={styles.savedIndicator}>✓ Saved</span>
              )}
              {resume.trim() && !resumeSaved && (
                <button className={styles.saveResumeBtn} onClick={handleSaveResume}>
                  💾 Save resume
                </button>
              )}
              {resumeSaved && (
                <button className={styles.clearResumeBtn} onClick={handleClearResume}>
                  Clear
                </button>
              )}
            </div>
          </div>
          <textarea
            className="textarea"
            placeholder="Paste your resume here — it will be saved for next time."
            value={resume}
            onChange={(e) => handleResumeChange(e.target.value)}
          />
        </div>
        <div className="card">
          <div className="card-label">Job Description</div>
          <textarea
            className="textarea"
            placeholder="Paste the job description here..."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className="btn-row">
        <button className="btn-primary" onClick={handleAnalyze} disabled={loading}>
          {loading && <span className="spinner" />}
          <span>{loading ? 'Analyzing…' : 'Analyze & Tailor'}</span>
        </button>
      </div>

      {loading && (
        <div className={styles.skeletons}>
          <div className="skeleton" style={{ width: '55%', height: 20 }} />
          <div className="skeleton" style={{ height: 90, marginTop: 8 }} />
          <div className="skeleton" style={{ height: 70 }} />
          <div className="skeleton" style={{ height: 70 }} />
        </div>
      )}

      {result && (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2 className={styles.resultsTitle}>Analysis Complete</h2>
            <span className={scoreBadgeClass(result.score)}>
              {scoreBadgeLabel(result.score)}
            </span>
          </div>

          <ScoreRing score={result.score} title={result.scoreTitle} summary={result.scoreSummary} />

          <div className="section-title">Keyword & Skill Analysis</div>
          <div className="grid-2">
            <div className="card">
              <div className="card-label" style={{ color: 'var(--success)' }}>✓ Strong Matches</div>
              <div className={styles.skillGrid}>
                {result.strongSkills.map((s) => <SkillPill key={s} label={s} type="strong" />)}
              </div>
            </div>
            <div className="card">
              <div className="card-label" style={{ color: 'var(--danger)' }}>✗ Missing / Gaps</div>
              <div className={styles.skillGrid}>
                {result.missingSkills.map((s) => <SkillPill key={s} label={s} type="missing" />)}
              </div>
            </div>
          </div>

          <div className="section-title">Tailored Resume Bullets</div>
          <p className={styles.hint}>Click any bullet to copy it.</p>
          <ul className={styles.bulletList}>
            {result.tailoredBullets.map((b, i) => (
              <BulletItem key={i} text={b} onCopy={handleCopy} />
            ))}
          </ul>

          <div className={styles.exportRow}>
            <span className={styles.exportLabel}>Export bullets:</span>
            <button className="btn-secondary" onClick={handleExportPDF}  disabled={!!exporting}>
              {exporting === 'pdf'  ? 'Exporting…' : '↓ PDF'}
            </button>
            <button className="btn-secondary" onClick={handleExportDOCX} disabled={!!exporting}>
              {exporting === 'docx' ? 'Exporting…' : '↓ .docx'}
            </button>
          </div>

          <div className="section-title">Recommendations</div>
          <ul className={styles.bulletList}>
            {result.tips.map((t, i) => (
              <li key={i} className={styles.bulletItem}>
                <span className={styles.arrow}>→</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
