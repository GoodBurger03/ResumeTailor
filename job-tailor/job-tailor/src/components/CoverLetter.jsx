import { useState, useEffect } from 'react';
import { generateCoverLetter } from '../services/analysis.js';
import { getSavedResume } from '../services/storage.js';
import styles from './CoverLetter.module.css';

export default function CoverLetter({ onToast }) {
  const [resume, setResume] = useState('');
  const [jd, setJd]         = useState('');
  const [loading, setLoading] = useState(false);
  const [letter, setLetter]   = useState('');
  const [error, setError]     = useState('');

  // Load saved resume on mount
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
      const text = await generateCoverLetter(resume, jd);
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

  return (
    <div>
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
          <span>{loading ? 'Generating…' : 'Generate Cover Letter'}</span>
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
            <span className="badge badge-green">Ready to send</span>
          </div>
          <div className={styles.letterOutput}>{letter}</div>
          <button className="btn-secondary" onClick={handleCopy} style={{ marginTop: 12 }}>
            ⎘ Copy to clipboard
          </button>
        </div>
      )}
    </div>
  );
}
