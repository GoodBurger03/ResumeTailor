import { useState, useEffect } from 'react';
import { getStats, getApplications } from '../services/storage.js';
import styles from './Dashboard.module.css';

const STATUS_CONFIG = {
  saved:     { label: 'Saved',     color: '#888' },
  applied:   { label: 'Applied',   color: '#e8ff47' },
  interview: { label: 'Interview', color: '#fb923c' },
  offer:     { label: 'Offer',     color: '#4ade80' },
  rejected:  { label: 'Rejected',  color: '#f87171' },
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue} style={accent ? { color: accent } : {}}>{value ?? '—'}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

function BarChart({ weeks }) {
  const max = Math.max(...weeks.map((w) => w.count), 1);
  return (
    <div className={styles.barChart}>
      {weeks.map((w, i) => (
        <div key={i} className={styles.barCol}>
          <div className={styles.barWrap}>
            <div
              className={styles.bar}
              style={{ height: `${(w.count / max) * 100}%` }}
              title={`${w.count} application${w.count !== 1 ? 's' : ''}`}
            />
          </div>
          <div className={styles.barLabel}>{w.label}</div>
        </div>
      ))}
    </div>
  );
}

function FunnelBar({ stats }) {
  const total = stats.total || 1;
  return (
    <div className={styles.funnel}>
      {Object.entries(STATUS_CONFIG).map(([id, cfg]) => {
        const count = stats.byStatus?.[id] || 0;
        const pct   = Math.round((count / total) * 100);
        return (
          <div key={id} className={styles.funnelRow}>
            <div className={styles.funnelLabel} style={{ color: cfg.color }}>{cfg.label}</div>
            <div className={styles.funnelTrack}>
              <div
                className={styles.funnelFill}
                style={{ width: `${pct}%`, background: cfg.color }}
              />
            </div>
            <div className={styles.funnelCount}>{count}</div>
          </div>
        );
      })}
    </div>
  );
}

function RecentList({ apps }) {
  if (!apps.length) return <p className={styles.empty}>No applications yet.</p>;
  return (
    <div className={styles.recentList}>
      {apps.slice(0, 8).map((a) => {
        const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.saved;
        const date = new Date(a.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return (
          <div key={a.id} className={styles.recentItem}>
            <div>
              <div className={styles.recentRole}>{a.role}</div>
              <div className={styles.recentCompany}>{a.company}</div>
            </div>
            <div className={styles.recentRight}>
              <span className={styles.recentStatus} style={{ color: cfg.color, borderColor: cfg.color }}>
                {cfg.label}
              </span>
              <span className={styles.recentDate}>{date}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [apps, setApps]   = useState([]);

  useEffect(() => {
    setStats(getStats());
    setApps(getApplications());
  }, []);

  if (!stats) return null;

  return (
    <div className={styles.dashboard}>
      {/* Top stat cards */}
      <div className={styles.statGrid}>
        <StatCard label="Total Applications" value={stats.total} />
        <StatCard label="Avg Match Score"    value={stats.avgScore !== null ? `${stats.avgScore}%` : null} accent="var(--accent)" />
        <StatCard label="Response Rate"      value={`${stats.responseRate}%`} accent="var(--success)"
          sub={`${(stats.byStatus?.interview || 0) + (stats.byStatus?.offer || 0)} responses`} />
        <StatCard label="Active Interviews"  value={stats.byStatus?.interview || 0} accent="var(--warn)" />
        <StatCard label="Offers"             value={stats.byStatus?.offer || 0}     accent="var(--success)" />
        <StatCard label="Rejected"           value={stats.byStatus?.rejected || 0}  accent="var(--danger)" />
      </div>

      <div className={styles.chartsRow}>
        {/* Activity chart */}
        <div className="card" style={{ flex: 1 }}>
          <div className="card-label">Applications per Week</div>
          <BarChart weeks={stats.weeks} />
        </div>

        {/* Funnel */}
        <div className="card" style={{ flex: 1 }}>
          <div className="card-label">Pipeline Breakdown</div>
          <FunnelBar stats={stats} />
        </div>
      </div>

      {/* Recent applications */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-label">Recent Applications</div>
        <RecentList apps={apps} />
      </div>
    </div>
  );
}
