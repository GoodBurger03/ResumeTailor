import { useState, useEffect, useRef } from 'react';
import { fetchJobs, getActiveSources } from '../services/jobFeed.js';
import { getAdzunaId, getMuseKey, getUSAJobsKey } from '../services/settings.js';
import { addApplication } from '../services/storage.js';
import styles from './JobBoard.module.css';

// Fetch a broad set of queries to get a wide pool of jobs
const BROAD_QUERIES = [
  'Software Engineer',
  'Integration Engineer',
  'Technical Sales Engineer',
  'Solutions Engineer',
  'Support Engineer',
  'Technical Program Manager',
  'DevOps Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'API Engineer',
  'Customer Success Engineer',
  'Sales Engineer',
];

const SOURCE_COLORS = {
  Adzuna:     { bg: '#e8ff47', color: '#000' },
  'The Muse': { bg: '#7c3aed', color: '#fff' },
  USAJobs:    { bg: '#1d4ed8', color: '#fff' },
  RemoteOK:   { bg: '#4ade80', color: '#000' },
};

const JOB_TYPES = ['All Types', 'Full-time', 'Part-time', 'Contract', 'Remote'];

const DATE_RANGES = [
  { label: 'Any time',    days: null },
  { label: 'Past 24h',   days: 1    },
  { label: 'Past week',  days: 7    },
  { label: 'Past month', days: 30   },
];

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
  const [allJobs, setAllJobs]     = useState([]);   // full unfiltered set from API
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const activeSources             = getActiveSources();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [keyword, setKeyword]     = useState('');
  const [location, setLocation]   = useState('');
  const [source, setSource]       = useState('All');
  const [jobType, setJobType]     = useState('All Types');
  const [dateRange, setDateRange] = useState(DATE_RANGES[0]);
  const [salaryOnly, setSalaryOnly] = useState(false);
  const [sortBy, setSortBy]       = useState('date'); // 'date' | 'company'

  const locationRef = useRef(location);
  useEffect(() => { locationRef.current = location; }, [location]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const results = await fetchJobs(BROAD_QUERIES, locationRef.current);
      setAllJobs(results);
      if (!results.length) setError('No results found. Try a different location or leave blank for nationwide.');
    } catch {
      setError('Failed to fetch jobs. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function clearFilters() {
    setKeyword('');
    setSource('All');
    setJobType('All Types');
    setDateRange(DATE_RANGES[0]);
    setSalaryOnly(false);
    setSortBy('date');
  }

  // ── Client-side filtering ─────────────────────────────────────────────────
  const visible = allJobs
    .filter((j) => {
      const text = `${j.title} ${j.company} ${j.location} ${j.desc}`.toLowerCase();

      // Keyword — supports multiple space-separated terms (AND logic)
      if (keyword.trim()) {
        const terms = keyword.trim().toLowerCase().split(/\s+/);
        if (!terms.every((t) => text.includes(t))) return false;
      }

      // Source
      if (source !== 'All' && j.source !== source) return false;

      // Job type — match against title/desc since APIs don't always return type
      if (jobType !== 'All Types') {
        const typeText = jobType.toLowerCase();
        if (!text.includes(typeText)) return false;
      }

      // Date range
      if (dateRange.days !== null && j.pubDate) {
        const cutoff = Date.now() - dateRange.days * 86400000;
        if (new Date(j.pubDate).getTime() < cutoff) return false;
      }

      // Salary only
      if (salaryOnly && !j.salary) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'company') return (a.company || '').localeCompare(b.company || '');
      return new Date(b.pubDate || 0) - new Date(a.pubDate || 0);
    });

  const filterOptions = ['All', ...activeSources];
  const activeFilterCount = [
    keyword, source !== 'All', jobType !== 'All Types',
    dateRange.days !== null, salaryOnly,
  ].filter(Boolean).length;

  const missingKeys = [
    !getAdzunaId()  && { name: 'Adzuna',   url: 'https://developer.adzuna.com' },
    !getMuseKey()   && { name: 'The Muse', url: 'https://www.themuse.com/developers/api/v2' },
    !getUSAJobsKey()&& { name: 'USAJobs',  url: 'https://developer.usajobs.gov' },
  ].filter(Boolean);

  return (
    <div>
      {missingKeys.length > 0 && (
        <div className={styles.tipBanner}>
          ⚡ Add free API keys in <strong>⚙ Settings</strong> to unlock:{' '}
          {missingKeys.map((k, i) => (
            <span key={k.name}>
              <a href={k.url} target="_blank" rel="noopener noreferrer">{k.name}</a>
              {i < missingKeys.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      )}

      {/* ── Search + Location + Fetch ── */}
      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            className={styles.searchInput}
            placeholder="Keywords (e.g. Java Kubernetes remote)…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {keyword && (
            <button className={styles.clearInput} onClick={() => setKeyword('')}>✕</button>
          )}
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

      {/* ── Filter bar ── */}
      <div className={styles.filterBar}>
        {/* Source pills */}
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

        {/* Job type */}
        <select
          className={styles.selectFilter}
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
        >
          {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>

        {/* Sort */}
        <select
          className={styles.selectFilter}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="date">Sort: Newest</option>
          <option value="company">Sort: Company A–Z</option>
        </select>

        {/* Salary toggle */}
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            className={styles.toggle}
            checked={salaryOnly}
            onChange={(e) => setSalaryOnly(e.target.checked)}
          />
          Salary listed
        </label>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <button className={styles.clearFilters} onClick={clearFilters}>
            Clear filters ({activeFilterCount})
          </button>
        )}

        <span className={styles.count}>{visible.length} of {allJobs.length} jobs</span>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading && (
        <div className={styles.skeletons}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 140 }} />
          ))}
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
          <p>No jobs match your filters.</p>
          <button className="btn-secondary" onClick={clearFilters}>Clear all filters</button>
        </div>
      )}

      {!loading && !error && allJobs.length === 0 && (
        <p className={styles.empty}>No jobs loaded yet. Hit Search to fetch listings.</p>
      )}
    </div>
  );
}
