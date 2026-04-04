import { useState } from 'react';
import { getSalaryInsights } from '../services/analysis.js';
import styles from './SalaryInsights.module.css';

function SalaryBar({ label, data, max }) {
  const pct = (v) => Math.round((v / max) * 100);
  return (
    <div className={styles.barRow}>
      <div className={styles.barLabel}>{label}</div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ left: `${pct(data.min)}%`, width: `${pct(data.max - data.min)}%` }} />
        <div className={styles.barMedian} style={{ left: `${pct(data.median)}%` }} title={`Median: $${(data.median/1000).toFixed(0)}k`} />
      </div>
      <div className={styles.barRange}>
        <span>${Math.round(data.min / 1000)}k</span>
        <span className={styles.barMed}>median ${Math.round(data.median / 1000)}k</span>
        <span>${Math.round(data.max / 1000)}k</span>
      </div>
    </div>
  );
}

export default function SalaryInsights({ onToast }) {
  const [title, setTitle]     = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState(null);
  const [error, setError]     = useState('');

  async function handleSearch() {
    if (!title.trim()) { setError('Please enter a job title.'); return; }
    setError('');
    setLoading(true);
    setData(null);
    try {
      const result = await getSalaryInsights(title, location);
      setData(result);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const maxSalary = data ? Math.max(data.ranges.senior.max, 300000) : 300000;

  return (
    <div>
      <div className={styles.searchRow}>
        <input
          className={styles.input}
          placeholder="Job title (e.g. Software Engineer, Solutions Engineer)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <input
          className={styles.input}
          placeholder="Location (optional, blank = national avg)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn-primary" onClick={handleSearch} disabled={loading}>
          {loading && <span className="spinner" />}
          <span>{loading ? 'Researching…' : '💰 Get Salary Data'}</span>
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading && (
        <div>
          <div className="skeleton" style={{ height: 200, marginTop: 8 }} />
          <div className="skeleton" style={{ height: 100, marginTop: 8 }} />
        </div>
      )}

      {data && (
        <div className={styles.results}>
          <div className={styles.header}>
            <h2 className={styles.title}>{data.title}</h2>
            <span className={styles.location}>📍 {data.location}</span>
          </div>

          {/* Salary bars */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-label">Salary Ranges (Base)</div>
            <div className={styles.bars}>
              <SalaryBar label="Entry" data={data.ranges.entry}  max={maxSalary} />
              <SalaryBar label="Mid"   data={data.ranges.mid}    max={maxSalary} />
              <SalaryBar label="Senior"data={data.ranges.senior} max={maxSalary} />
            </div>
          </div>

          {/* Total comp */}
          <div className="grid-2">
            <div className="card">
              <div className="card-label">Total Compensation</div>
              <div className={styles.compGrid}>
                <div className={styles.compItem}>
                  <span className={styles.compLabel}>Base (mid-level)</span>
                  <span className={styles.compVal}>${Math.round(data.totalComp.base / 1000)}k</span>
                </div>
                <div className={styles.compItem}>
                  <span className={styles.compLabel}>Bonus</span>
                  <span className={styles.compVal}>{data.totalComp.bonus}</span>
                </div>
                <div className={styles.compItem}>
                  <span className={styles.compLabel}>Equity</span>
                  <span className={styles.compVal}>{data.totalComp.equity}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-label">Top Paying Companies</div>
              <div className={styles.companies}>
                {data.topPayingCompanies?.map((c, i) => (
                  <div key={i} className={styles.company}>
                    <span className={styles.companyRank}>{i + 1}</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Market factors */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-label">Market Factors</div>
            <ul className={styles.factorList}>
              {data.marketFactors?.map((f, i) => <li key={i} className={styles.factor}>→ {f}</li>)}
            </ul>
          </div>

          {/* Negotiation tips */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-label" style={{ color: 'var(--success)' }}>💡 Negotiation Tips</div>
            <ul className={styles.factorList}>
              {data.negotiationTips?.map((t, i) => <li key={i} className={styles.factor}>→ {t}</li>)}
            </ul>
          </div>

          {/* Disclaimer */}
          <p className={styles.disclaimer}>{data.disclaimer}</p>

          {/* External links */}
          <div className={styles.externalLinks}>
            <span className={styles.extLabel}>Verify on:</span>
            <a href={`https://www.glassdoor.com/Salaries/${encodeURIComponent(title)}-salary-SRCH_KO0,${title.length}.htm`} target="_blank" rel="noopener noreferrer" className={styles.extLink}>Glassdoor ↗</a>
            <a href="https://www.levels.fyi" target="_blank" rel="noopener noreferrer" className={styles.extLink}>Levels.fyi ↗</a>
            <a href={`https://www.linkedin.com/salary/search?keywords=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer" className={styles.extLink}>LinkedIn Salary ↗</a>
          </div>
        </div>
      )}
    </div>
  );
}
