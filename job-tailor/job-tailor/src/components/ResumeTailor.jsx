import { useState } from 'react';
import { tailorResume } from '../services/analysis.js';
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

export default function ResumeTailor({ onToast }) {
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

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

  return (
    <div>
      {/* Inputs */}
      <div className="grid-2">
        <div className="card">
          <div className="card-label">Your Resume</div>
          <textarea
            className="textarea"
            placeholder="Paste your full resume here..."
            value={resume}
            onChange={(e) => setResume(e.target.value)}
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

      {/* Skeleton */}
      {loading && (
        <div className={styles.skeletons}>
          <div className="skeleton" style={{ width: '55%', height: 20 }} />
          <div className="skeleton" style={{ height: 90, marginTop: 8 }} />
          <div className="skeleton" style={{ height: 70 }} />
          <div className="skeleton" style={{ height: 70 }} />
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2 className={styles.resultsTitle}>Analysis Complete</h2>
            <span className={scoreBadgeClass(result.score)}>
              {scoreBadgeLabel(result.score)}
            </span>
          </div>

          <ScoreRing
            score={result.score}
            title={result.scoreTitle}
            summary={result.scoreSummary}
          />

          {/* Skills */}
          <div className="section-title">Keyword & Skill Analysis</div>
          <div className="grid-2">
            <div className="card">
              <div className="card-label" style={{ color: 'var(--success)' }}>✓ Strong Matches</div>
              <div className={styles.skillGrid}>
                {result.strongSkills.map((s) => (
                  <SkillPill key={s} label={s} type="strong" />
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-label" style={{ color: 'var(--danger)' }}>✗ Missing / Gaps</div>
              <div className={styles.skillGrid}>
                {result.missingSkills.map((s) => (
                  <SkillPill key={s} label={s} type="missing" />
                ))}
              </div>
            </div>
          </div>

          {/* Tailored bullets */}
          <div className="section-title">Tailored Resume Bullets</div>
          <p className={styles.hint}>Click any bullet to copy it.</p>
          <ul className={styles.bulletList}>
            {result.tailoredBullets.map((b, i) => (
              <BulletItem key={i} text={b} onCopy={handleCopy} />
            ))}
          </ul>

          {/* Tips */}
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
