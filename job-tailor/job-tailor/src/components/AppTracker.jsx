import { useState, useEffect } from 'react';
import {
  getApplications, addApplication, updateApplication, deleteApplication,
} from '../services/storage.js';
import styles from './AppTracker.module.css';

const COLUMNS = [
  { id: 'saved',     label: 'Saved',     color: '#888' },
  { id: 'applied',   label: 'Applied',   color: '#e8ff47' },
  { id: 'interview', label: 'Interview', color: '#fb923c' },
  { id: 'offer',     label: 'Offer',     color: '#4ade80' },
  { id: 'rejected',  label: 'Rejected',  color: '#f87171' },
];

function AddForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ company: '', role: '', location: '', url: '', notes: '' });

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSubmit() {
    if (!form.company || !form.role) return;
    onAdd(form);
  }

  return (
    <div className={styles.addForm}>
      <div className={styles.formRow}>
        <input className={styles.input} placeholder="Company *" value={form.company} onChange={(e) => set('company', e.target.value)} />
        <input className={styles.input} placeholder="Role *"    value={form.role}    onChange={(e) => set('role',    e.target.value)} />
      </div>
      <div className={styles.formRow}>
        <input className={styles.input} placeholder="Location"  value={form.location} onChange={(e) => set('location', e.target.value)} />
        <input className={styles.input} placeholder="Job URL"   value={form.url}      onChange={(e) => set('url',      e.target.value)} />
      </div>
      <textarea
        className={styles.notesInput}
        placeholder="Notes…"
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
      />
      <div className={styles.formActions}>
        <button className="btn-primary" style={{ padding: '10px 24px', fontSize: 14 }} onClick={handleSubmit}>
          Add Application
        </button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function AppCard({ app, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes]     = useState(app.notes || '');
  const col = COLUMNS.find((c) => c.id === app.status) || COLUMNS[0];
  const date = new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  function saveNotes() {
    onUpdate(app.id, { notes });
    setEditing(false);
  }

  return (
    <div className={styles.appCard}>
      <div className={styles.appCardTop}>
        <div>
          <div className={styles.appRole}>{app.role}</div>
          <div className={styles.appCompany}>{app.company}</div>
          {app.location && <div className={styles.appLocation}>{app.location}</div>}
        </div>
        <button className={styles.deleteBtn} onClick={() => onDelete(app.id)} title="Delete">✕</button>
      </div>

      {app.matchScore !== null && (
        <div className={styles.scoreChip}>Match: {app.matchScore}%</div>
      )}

      <div className={styles.appMeta}>
        <span className={styles.dateBadge}>{date}</span>
        {app.url && (
          <a className={styles.urlLink} href={app.url} target="_blank" rel="noopener noreferrer">View ↗</a>
        )}
      </div>

      {/* Status selector */}
      <select
        className={styles.statusSelect}
        style={{ borderColor: col.color, color: col.color }}
        value={app.status}
        onChange={(e) => onUpdate(app.id, { status: e.target.value })}
      >
        {COLUMNS.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>

      {/* Notes */}
      {editing ? (
        <div>
          <textarea
            className={styles.notesInput}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={saveNotes}>Save</button>
            <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className={styles.notesRow} onClick={() => setEditing(true)}>
          {app.notes ? <span className={styles.notesText}>{app.notes}</span> : <span className={styles.notesPlaceholder}>+ Add notes</span>}
        </div>
      )}
    </div>
  );
}

export default function AppTracker({ onToast }) {
  const [apps, setApps]         = useState([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch]     = useState('');

  function reload() { setApps(getApplications()); }
  useEffect(() => { reload(); }, []);

  function handleAdd(form) {
    addApplication(form);
    reload();
    setShowAdd(false);
    onToast('Application added!');
  }

  function handleUpdate(id, changes) {
    updateApplication(id, changes);
    reload();
  }

  function handleDelete(id) {
    deleteApplication(id);
    reload();
    onToast('Removed.');
  }

  const visible = apps.filter((a) => {
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchSearch = !search || `${a.company} ${a.role}`.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div>
      {/* Header row */}
      <div className={styles.headerRow}>
        <input
          className={styles.searchInput}
          placeholder="Search company or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Application</button>
      </div>

      {/* Status filter tabs */}
      <div className={styles.filterRow}>
        <button
          className={`${styles.filterBtn} ${filterStatus === 'all' ? styles.filterActive : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All ({apps.length})
        </button>
        {COLUMNS.map((c) => {
          const count = apps.filter((a) => a.status === c.id).length;
          return (
            <button
              key={c.id}
              className={`${styles.filterBtn} ${filterStatus === c.id ? styles.filterActive : ''}`}
              style={filterStatus === c.id ? { borderColor: c.color, color: c.color, background: 'transparent' } : {}}
              onClick={() => setFilterStatus(c.id)}
            >
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {showAdd && (
        <AddForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
      )}

      {visible.length === 0 && !showAdd && (
        <div className={styles.empty}>
          {apps.length === 0
            ? 'No applications yet. Add one manually or save a job from the Job Board tab.'
            : 'No applications match your filter.'}
        </div>
      )}

      <div className={styles.grid}>
        {visible.map((app) => (
          <AppCard key={app.id} app={app} onUpdate={handleUpdate} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
