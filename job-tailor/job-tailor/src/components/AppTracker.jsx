import { useState, useEffect } from 'react';
import { getApplications, addApplication, updateApplication, deleteApplication } from '../services/storage.js';
import styles from './AppTracker.module.css';

const COLUMNS = [
  { id: 'saved',     label: 'Saved',     color: '#888'    },
  { id: 'applied',   label: 'Applied',   color: '#e8ff47' },
  { id: 'interview', label: 'Interview', color: '#fb923c' },
  { id: 'offer',     label: 'Offer',     color: '#4ade80' },
  { id: 'rejected',  label: 'Rejected',  color: '#f87171' },
];

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest first'   },
  { value: 'oldest',   label: 'Oldest first'   },
  { value: 'company',  label: 'Company A–Z'    },
  { value: 'followup', label: 'Follow-up due'  },
];

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isFollowUpOverdue(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

function AddForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ company: '', role: '', location: '', url: '', notes: '', followUpDate: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
      <div className={styles.formRow}>
        <div style={{ flex: 1 }}>
          <label className={styles.fieldLabel}>Follow-up reminder</label>
          <input className={styles.input} type="date" value={form.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} />
        </div>
      </div>
      <textarea className={styles.notesInput} placeholder="Notes…" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      <div className={styles.formActions}>
        <button className="btn-primary" style={{ fontSize: 14 }} onClick={() => { if (form.company && form.role) onAdd(form); }}>
          Add Application
        </button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function AppCard({ app, onUpdate, onDelete }) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes]               = useState(app.notes || '');
  const [editingFollowUp, setEditingFollowUp] = useState(false);

  const col      = COLUMNS.find((c) => c.id === app.status) || COLUMNS[0];
  const overdue  = isFollowUpOverdue(app.followUpDate);
  const statusAt = app.statusChangedAt ? formatDate(app.statusChangedAt) : formatDate(app.appliedAt);

  function handleStatusChange(status) {
    onUpdate(app.id, { status, statusChangedAt: new Date().toISOString() });
  }

  return (
    <div className={`${styles.appCard} ${overdue ? styles.overdue : ''}`}>
      {/* Top row */}
      <div className={styles.appCardTop}>
        <div className={styles.appInfo}>
          <div className={styles.appRole}>{app.role}</div>
          <div className={styles.appCompany}>{app.company}</div>
          {app.location && <div className={styles.appLocation}>{app.location}</div>}
        </div>
        <button className={styles.deleteBtn} onClick={() => onDelete(app.id)} title="Delete">✕</button>
      </div>

      {/* Match score */}
      {app.matchScore != null && (
        <div className={styles.scoreChip}>Match: {app.matchScore}%</div>
      )}

      {/* Meta row */}
      <div className={styles.appMeta}>
        <span className={styles.dateBadge} title="Status changed">{statusAt}</span>
        {app.url && <a className={styles.urlLink} href={app.url} target="_blank" rel="noopener noreferrer">View ↗</a>}
      </div>

      {/* Follow-up */}
      <div className={styles.followUpRow}>
        {editingFollowUp ? (
          <div className={styles.followUpEdit}>
            <input
              type="date"
              className={styles.input}
              defaultValue={app.followUpDate || ''}
              onBlur={(e) => { onUpdate(app.id, { followUpDate: e.target.value }); setEditingFollowUp(false); }}
              autoFocus
            />
          </div>
        ) : app.followUpDate ? (
          <button
            className={`${styles.followUpBadge} ${overdue ? styles.followUpOverdue : ''}`}
            onClick={() => setEditingFollowUp(true)}
            title="Click to change"
          >
            {overdue ? '⚠ Overdue: ' : '🔔 Follow up: '}{formatDate(app.followUpDate)}
          </button>
        ) : (
          <button className={styles.addFollowUp} onClick={() => setEditingFollowUp(true)}>
            + Set follow-up date
          </button>
        )}
      </div>

      {/* Status */}
      <select
        className={styles.statusSelect}
        style={{ borderColor: col.color, color: col.color }}
        value={app.status}
        onChange={(e) => handleStatusChange(e.target.value)}
      >
        {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>

      {/* Notes */}
      {editingNotes ? (
        <div>
          <textarea className={styles.notesInput} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { onUpdate(app.id, { notes }); setEditingNotes(false); }}>Save</button>
            <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setEditingNotes(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className={styles.notesRow} onClick={() => setEditingNotes(true)}>
          {app.notes
            ? <span className={styles.notesText}>{app.notes}</span>
            : <span className={styles.notesPlaceholder}>+ Add notes</span>}
        </div>
      )}
    </div>
  );
}

export default function AppTracker({ onToast }) {
  const [apps, setApps]               = useState([]);
  const [showAdd, setShowAdd]         = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch]           = useState('');
  const [sortBy, setSortBy]           = useState('newest');

  function reload() { setApps(getApplications()); }
  useEffect(() => { reload(); }, []);

  function handleAdd(form) { addApplication(form); reload(); setShowAdd(false); onToast('Application added!'); }
  function handleUpdate(id, changes) { updateApplication(id, changes); reload(); }
  function handleDelete(id) { deleteApplication(id); reload(); onToast('Removed.'); }

  const visible = apps
    .filter((a) => {
      const matchStatus = filterStatus === 'all' || a.status === filterStatus;
      const matchSearch = !search || `${a.company} ${a.role}`.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'oldest')   return new Date(a.appliedAt) - new Date(b.appliedAt);
      if (sortBy === 'company')  return a.company.localeCompare(b.company);
      if (sortBy === 'followup') {
        if (!a.followUpDate) return 1;
        if (!b.followUpDate) return -1;
        return new Date(a.followUpDate) - new Date(b.followUpDate);
      }
      return new Date(b.appliedAt) - new Date(a.appliedAt); // newest
    });

  const overdueCount = apps.filter((a) => isFollowUpOverdue(a.followUpDate)).length;

  return (
    <div>
      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div className={styles.overdueBanner}>
          ⚠ {overdueCount} follow-up{overdueCount > 1 ? 's' : ''} overdue — consider reaching out.
          <button className={styles.overdueSortBtn} onClick={() => setSortBy('followup')}>Sort by follow-up →</button>
        </div>
      )}

      {/* Controls */}
      <div className={styles.headerRow}>
        <input className={styles.searchInput} placeholder="Search company or role…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={styles.sortSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Application</button>
      </div>

      {/* Status filter */}
      <div className={styles.filterRow}>
        <button className={`${styles.filterBtn} ${filterStatus === 'all' ? styles.filterActive : ''}`} onClick={() => setFilterStatus('all')}>
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

      {showAdd && <AddForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />}

      {visible.length === 0 && !showAdd && (
        <div className={styles.empty}>
          {apps.length === 0 ? 'No applications yet. Add one or save a job from the Job Board.' : 'No applications match your filter.'}
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
