import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchJobs, getActiveSources } from '../services/jobFeed.js';
import { getAdzunaId, getMuseKey, getUSAJobsKey } from '../services/settings.js';
import { addApplication } from '../services/storage.js';
import styles from './JobBoard.module.css';

const SOURCE_COLORS = {
  Adzuna:     { bg: '#e8ff47', color: '#000' },
  'The Muse': { bg: '#7c3aed', color: '#fff' },
  USAJobs:    { bg: '#1d4ed8', color: '#fff' },
  RemoteOK:   { bg: '#4ade80', color: '#000' },
};

const JOB_TYPES   = ['All Types', 'Full-time', 'Part-time', 'Contract', 'Remote'];
const SORT_OPTIONS = [
  { value: 'date',    label: 'Newest first' },
  { value: 'company', label: 'Company A–Z' },
  { value: 'salary',  label: 'Salary (high–low)' },
];
const DATE_RANGES = [
  { label: 'Any time',   days: null },
  { label: 'Past 24h',  days: 1    },
  { label: 'Past week', days: 7    },
  { label: 'Past month',days: 30   },
];

function parseSalaryMin(salaryStr) {
  if (!salaryStr) return 0;
  const match = salaryStr.match(/\$(\d+)k/);
  return match ? parseInt(match[1]) * 1000 : 0;
}

function JobCard({ job, onSave, onTailor }) {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    addApplication({ company: job.company, role: job.title, location: job.location, url: job.link, status: 'saved' });
    setSaved(true);
    onSave();
  }

  const ago = job.pubDate ? Math.round((Date.now() - new Date(job.pubDate)) / 86400000) : null;
  const srcStyle = SOURCE_COLORS[job.source] || { bg: '#555', color: '#fff' };

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.sourceBadge} style={{ background: srcStyle.bg, color: srcStyle.color }}>
          {job.source}
        </div>
        {ago !== null && (
          <span className={styles.ago}>{ago === 0 ? 'Today' : ago === 1 ? 'Yesterday' : `${ago}d ago`}</span>
        )}
      </div>
      <h3 className={styles.title}>{job.title}</h3>
      <div className={styles.meta}>
        <span>{job.company}</span>
        {job.location && <><span className={styles.dot}>·</span><span>{job.location}</span></>}
        {job.salary   && <><span className={styles.dot}>·</span><span className={styles.salary}>{job.salary}</span></>}
      </div>
      {job.desc && <p className={styles.desc}>{job.desc}…</p>}
      <div className={styles.actions}>
        <a className={styles.btnLink} href={job.link} target="_blank" rel="noopener noreferrer">View Job ↗</a>
        <button className={styles.btnTailor} onClick={() => onTailor(job)}>✦ Tailor Resume</button>
        <button className={`${styles.btnSave} ${saved ? styles.saved : ''}`} onClick={handleSave} disabled={saved}>
          {saved ? '✓ Saved' : '+ Track'}
        </button>
      </div>
    </div>
  );
}

export default function JobBoard({ onTailorJob, onToast }) {
  const [allJobs, setAllJobs]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [activeSources, setActiveSources] = useState(['RemoteOK']);
  const [missingKeys, setMissingKeys]     = useState([]);

  // Filter state
  const [keyword, setKeyword]       = useState('');
  const [location, setLocation]     = useState('');
  const [source, setSource]         = useState('All');
  const [jobType, setJobType]       = useState('All Types');
  const [dateRange, setDateRange]   = useState(DATE_RANGES[0]);
  const [salaryOnly, setSalaryOnly] = useState(false);
  const [sortBy, setSortBy]         = useState('date');

  const locationRef = useRef(location);
  useEffect(() => { locationRef.current = location; }, [location]);

  // Load active sources and missing keys on mount
  useEffect(() => {
    setActiveSources(getActiveSources());
    setMissingKeys([
      !getAdzunaId()  && { name: 'Adzuna',   url: 'https://developer.adzuna.com' },
      !getMuseKey()   && { name: 'The Muse', url: 'https://www.themuse.com/developers/api/v2' },
      !getUSAJobsKey()&& { name: 'USAJobs',  url: 'https://developer.usajobs.gov' },
    ].filter(Boolean));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const results = await fetchJobs(locationRef.current);
      setAllJobs(results);
      if (!results.length) setError('No results found. Try a different location or leave blank for nationwide.');
    } catch {
      setError('Failed to fetch jobs. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function clearFilters() {
    setKeyword(''); setSource('All'); setJobType('All Types');
    setDateRange(DATE_RANGES[0]); setSalaryOnly(false); setSortBy('date');
  }

  // ── Client-side filtering & sorting ──────────────────────────────────────
  const visible = allJobs
    .filter((j) => {
      const text = `${j.title} ${j.company} ${j.location} ${j.desc}`.toLowerCase();

      // Keyword — supports comma-separated OR logic, space = AND
      if (keyword.trim()) {
        const orTerms = keyword.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
        const matchesAny = orTerms.some((orTerm) => {
          const andTerms = orTerm.split(/\s+/).filter(Boolean);
          return andTerms.every((t) => text.includes(t));
        });
        if (!matchesAny) return false;
      }

      if (source !== 'All' && j.source !== source) return false;
      if (jobType !== 'All Types' && !text.includes(jobType.toLowerCase())) return false;
      if (dateRange.days !== null && j.pubDate) {
        if (new Date(j.pubDate).getTime() < Date.now() - dateRange.days * 86400000) return false;
      }
      if (salaryOnly && !j.salary) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'company') return (a.company || '').localeCompare(b.company || '');
      if (sortBy === 'salary')  return parseSalaryMin(b.salary) - parseSalaryMin(a.salary);
      return new Date(b.pubDate || 0) - new Date(a.pubDate || 0);
    });

  const filterOptions      = ['All', ...activeSources];
  const activeFilterCount  = [keyword, source !== 'All', jobType !== 'All Types', dateRange.days !== null, salaryOnly].filter(Boolean).length;

  return (
    <div>
      {missingKeys.length > 0 && (
        <div className={styles.tipBanner}>
          ⚡ Add free API keys in <strong>⚙ Settings</strong> to unlock more sources:{' '}
          {missingKeys.map((k, i) => (
            <span key={k.name}>
              <a href={k.url} target="_blank" rel="noopener noreferrer">{k.name}</a>
              {i < missingKeys.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      )}

      {/* Search + Location + Fetch */}
      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            className={styles.searchInput}
            placeholder="Keywords: Java Kubernetes  |  comma for OR: engineer, manager"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {keyword && <button className={styles.clearInput} onClick={() => setKeyword('')}>✕</button>}
        </div>
        <input
          className={styles.locationInput}
          placeholder="Location (blank = nationwide)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button className="btn-primary" onClick={load} disabled={loading}>
          {loading && <span className="spinner" />}
          <span>{loading ? 'Fetching…' : 'Search'}</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        {/* Source */}
        <div className={styles.filterGroup}>
          {filterOptions.map((s) => (
            <button
              key={s}
              className={`${styles.filterBtn} ${source === s ? styles.filterActive : ''}`}
              onClick={() => setSource(s)}
            >
              {s}{s !== 'All' && ` (${allJobs.filter((j) => j.source === s).length})`}
            </button>
          ))}
        </div>

        <div className={styles.filterDivider} />

        {/* Date range */}
        <div className={styles.filterGroup}>
          {DATE_RANGES.map((d) => (
            <button
              key={d.label}
              className={`${styles.filterBtn} ${dateRange.label === d.label ? styles.filterActive : ''}`}
              onClick={() => setDateRange(d)}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className={styles.filterDivider} />

        <select className={styles.selectFilter} value={jobType} onChange={(e) => setJobType(e.target.value)}>
          {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>

        <select className={styles.selectFilter} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label className={styles.toggleLabel}>
          <input type="checkbox" className={styles.toggle} checked={salaryOnly} onChange={(e) => setSalaryOnly(e.target.checked)} />
          Salary listed
        </label>

        {activeFilterCount > 0 && (
          <button className={styles.clearFilters} onClick={clearFilters}>
            Clear filters ({activeFilterCount})
          </button>
        )}

        <span className={styles.count}>{visible.length} of {allJobs.length} jobs</span>
      </div>

      {/* Keyword hint */}
      {!keyword && (
        <p className={styles.keywordHint}>
          💡 Tip: Use spaces for AND (e.g. <em>java remote</em>), commas for OR (e.g. <em>engineer, manager</em>)
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {loading && (
        <div className={styles.skeletons}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 140 }} />)}
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className={styles.grid}>
          {visible.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onSave={() => onToast('Added to tracker!')}
              onTailor={(j) => { onTailorJob(j); onToast('Job loaded in Resume Tailor!'); }}
            />
          ))}
        </div>
      )}

      {!loading && !error && allJobs.length > 0 && visible.length === 0 && (
        <div className={styles.noResults}>
          <p>No jobs match your current filters.</p>
          <button className="btn-secondary" onClick={clearFilters}>Clear all filters</button>
        </div>
      )}

      {!loading && !error && allJobs.length === 0 && (
        <p className={styles.empty}>No jobs loaded yet. Hit Search to fetch listings.</p>
      )}
    </div>
  );
}
