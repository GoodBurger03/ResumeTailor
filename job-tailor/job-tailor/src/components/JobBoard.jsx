import { useState, useEffect, useRef } from 'react';
import { fetchJobs, DEFAULT_QUERIES, hasAdzunaKeys, getActiveSources } from '../services/jobFeed.js';
import { addApplication } from '../services/storage.js';
import styles from './JobBoard.module.css';

const SOURCE_COLORS = {
  Adzuna:    { bg: '#e8ff47', color: '#000' },
  'The Muse':{ bg: '#7c3aed', color: '#fff' },
  USAJobs:   { bg: '#1d4ed8', color: '#fff' },
  RemoteOK:  { bg: '#4ade80', color: '#000' },
};

function JobCard({ job, onSave, onTailor }) {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    addApplication({
      company:  job.company,
      role:     job.title,
      location: job.location,
      url:      job.link,
      status:   'saved',
    });
    setSaved(true);
    onSave();
  }

  const ago = job.pubDate
    ? Math.round((Date.now() - new Date(job.pubDate)) / 86400000)
    : null;

  const srcStyle = SOURCE_COLORS[job.source] || { bg: '#555', color: '#fff' };

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div
          className={styles.sourceBadge}
          style={{ background: srcStyle.bg, color: srcStyle.color }}
        >
          {job.source}
        </div>
        {ago !== null && (
          <span className={styles.ago}>
            {ago === 0 ? 'Today' : ago === 1 ? 'Yesterday' : `${ago}d ago`}
          </span>
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
        <a className={styles.btnLink} href={job.link} target="_blank" rel="noopener noreferrer">
          View Job ↗
        </a>
        <button className={styles.btnTailor} onClick={() => onTailor(job)}>
          ✦ Tailor Resume
        </button>
        <button
          className={`${styles.btnSave} ${saved ? styles.saved : ''}`}
          onClick={handleSave}
          disabled={saved}
        >
          {saved ? '✓ Saved' : '+ Track'}
        </button>
      </div>
    </div>
  );
}

export default function JobBoard({ onTailorJob, onToast }) {
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [location, setLocation] = useState('');
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('All');
  const activeSources           = getActiveSources();

  const locationRef = useRef(location);
  useEffect(() => { locationRef.current = location; }, [location]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const results = await fetchJobs(DEFAULT_QUERIES, locationRef.current);
      setJobs(results);
      if (!results.length) {
        setError('No results found. Try a different location or leave blank for nationwide results.');
      }
    } catch {
      setError('Failed to fetch jobs. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filterOptions = ['All', ...activeSources];

  const visible = jobs.filter((j) => {
    const matchFilter = filter === 'All' || j.source === filter;
    const matchSearch = !search ||
      `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const missingKeys = [];
  if (!import.meta.env.VITE_ADZUNA_APP_ID)   missingKeys.push({ name: 'Adzuna',   url: 'https://developer.adzuna.com' });
  if (!import.meta.env.VITE_MUSE_API_KEY)     missingKeys.push({ name: 'The Muse', url: 'https://www.themuse.com/developers/api/v2' });
  if (!import.meta.env.VITE_USAJOBS_API_KEY)  missingKeys.push({ name: 'USAJobs',  url: 'https://developer.usajobs.gov' });

  return (
    <div>
      {/* Missing keys banner */}
      {missingKeys.length > 0 && (
        <div className={styles.tipBanner}>
          ⚡ Add free API keys to unlock more sources:{' '}
          {missingKeys.map((k, i) => (
            <span key={k.name}>
              <a href={k.url} target="_blank" rel="noopener noreferrer">{k.name}</a>
              {i < missingKeys.length - 1 ? ', ' : ''}
            </span>
          ))}
          {' '}— add them to your <code>.env</code>.
        </div>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        <input
          className={styles.searchInput}
          placeholder="Filter by title or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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

      {/* Source filter — dynamic based on configured keys */}
      <div className={styles.filterRow}>
        {filterOptions.map((s) => (
          <button
            key={s}
            className={`${styles.filterBtn} ${filter === s ? styles.filterActive : ''}`}
            onClick={() => setFilter(s)}
          >
            {s} {s !== 'All' && `(${jobs.filter((j) => j.source === s).length})`}
          </button>
        ))}
        <span className={styles.count}>{visible.length} listings</span>
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
              onTailor={(j) => {
                onTailorJob(j);
                onToast('Job loaded in Resume Tailor!');
              }}
            />
          ))}
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <p className={styles.empty}>No jobs match your current filters.</p>
      )}
    </div>
  );
}
