import { useState, useEffect } from 'react';
import { generateCoverLetter, COVER_LETTER_TONES } from '../services/analysis.js';
import { getSavedResume } from '../services/storage.js';
import styles from './CoverLetter.module.css';

export default function CoverLetter({ onToast }) {
  const [resume, setResume]   = useState('');
  const [jd, setJd]           = useState('');
  const [tone, setTone]       = useState('conversational');
  const [loading, setLoading] = useState(false);
  const [letter, setLetter]   = useState('');
  const [error, setError]     = useState('');

  useEffect(() => {
    const saved = getSavedResume();
    if (saved) setResume(saved);
  }, []);

  async function handleGenerate() {
    if (!resume.trim() || !jd.trim()) {
      setError('Please paste both your resume and the job description.');
      return;
    }
    setError('');
    setLoading(true);
    setLetter('');
    try {
      const text = await generateCoverLetter(resume, jd, tone);
      setLetter(text);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(letter);
    onToast('Copied!');
  }

  const selectedTone = COVER_LETTER_TONES[tone];

  return (
    <div>
      {/* Tone selector */}
      <div className={styles.toneSection}>
        <div className="card-label" style={{ marginBottom: 12 }}>Cover Letter Style</div>
        <div className={styles.toneGrid}>
          {Object.entries(COVER_LETTER_TONES).map(([key, cfg]) => (
            <button
              key={key}
              className={`${styles.toneCard} ${tone === key ? styles.toneActive : ''}`}
              onClick={() => { setTone(key); setLetter(''); }}
            >
              <span className={styles.toneEmoji}>{cfg.emoji}</span>
              <span className={styles.toneLabel}>{cfg.label}</span>
              <span className={styles.toneDesc}>{cfg.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="grid-2">
        <div className="card">
          <div className="card-label">
            Your Resume
            {resume && <span className={styles.resumeNote}> (loaded from saved)</span>}
          </div>
          <textarea
            className="textarea"
            placeholder="Paste your resume here..."
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
        <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading && <span className="spinner" />}
          <span>{loading ? 'Generating…' : `Generate ${selectedTone.emoji} ${selectedTone.label} Letter`}</span>
        </button>
      </div>

      {loading && (
        <div>
          <div className="skeleton" style={{ width: '40%', height: 20 }} />
          <div className="skeleton" style={{ height: 200, marginTop: 8 }} />
        </div>
      )}

      {letter && (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2 className={styles.resultsTitle}>Cover Letter</h2>
            <span className={styles.tonePill}>{selectedTone.emoji} {selectedTone.label}</span>
            <span className="badge badge-green">Ready to send</span>
          </div>
          <div className={styles.letterOutput}>{letter}</div>
          <div className={styles.letterActions}>
            <button className="btn-secondary" onClick={handleCopy}>⎘ Copy to clipboard</button>
            <button className="btn-secondary" onClick={() => { setLetter(''); setTone('conversational'); }}>
              ↺ Generate different style
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
