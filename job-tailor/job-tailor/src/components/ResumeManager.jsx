import { useState, useEffect } from 'react';
import {
  getResumeVersions, saveResumeVersion, deleteResumeVersion,
  getActiveResumeId, setActiveResume, clearActiveResume, getActiveResumeContent,
} from '../services/storage.js';
import styles from './ResumeManager.module.css';

function VersionCard({ version, isActive, onActivate, onEdit, onDelete }) {
  const date = new Date(version.updatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const preview = version.content.slice(0, 120).replace(/\n+/g, ' ');

  return (
    <div className={`${styles.vCard} ${isActive ? styles.vActive : ''}`}>
      <div className={styles.vTop}>
        <div>
          <div className={styles.vName}>{version.name}</div>
          <div className={styles.vMeta}>{date} · {version.content.split(/\s+/).length.toLocaleString()} words</div>
        </div>
        {isActive && <span className={styles.activeBadge}>✓ Active</span>}
      </div>
      <p className={styles.vPreview}>{preview}…</p>
      <div className={styles.vActions}>
        {!isActive ? (
          <button className={styles.activateBtn} onClick={() => onActivate(version.id)}>
            Set as Active
          </button>
        ) : (
          <button className="btn-secondary" style={{ fontSize: 13 }} onClick={clearActiveResume}>
            Deactivate
          </button>
        )}
        <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => onEdit(version)}>
          Edit
        </button>
        <button className={styles.deleteBtn} onClick={() => onDelete(version.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default function ResumeManager({ onToast }) {
  const [versions, setVersions]   = useState([]);
  const [activeId, setActiveId]   = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null); // version being edited
  const [formName, setFormName]   = useState('');
  const [formContent, setFormContent] = useState('');

  function reload() {
    setVersions(getResumeVersions());
    setActiveId(getActiveResumeId());
  }

  useEffect(() => { reload(); }, []);

  function openNew() {
    setEditing(null);
    setFormName('');
    setFormContent('');
    setShowForm(true);
  }

  function openEdit(version) {
    setEditing(version);
    setFormName(version.name);
    setFormContent(version.content);
    setShowForm(true);
  }

  function handleSave() {
    if (!formName.trim() || !formContent.trim()) {
      onToast('Name and content are required.');
      return;
    }
    saveResumeVersion({ id: editing?.id, name: formName.trim(), content: formContent.trim() });
    reload();
    setShowForm(false);
    onToast(editing ? 'Resume updated!' : 'Resume saved!');
  }

  function handleActivate(id) {
    setActiveResume(id);
    reload();
    onToast('Resume set as active — it will load automatically in Resume Tailor and Cover Letter.');
  }

  function handleDeactivate() {
    clearActiveResume();
    reload();
    onToast('Active resume cleared.');
  }

  function handleDelete(id) {
    deleteResumeVersion(id);
    reload();
    onToast('Deleted.');
  }

  return (
    <div>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <p className={styles.desc}>
            Save multiple resume versions — engineering, sales, TPM — and switch between them
            without re-pasting. The active version auto-loads in Resume Tailor and Cover Letter.
          </p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ New Resume</button>
      </div>

      {/* Active resume info */}
      {activeId && (
        <div className={styles.activeBanner}>
          ✦ Active resume: <strong>{versions.find((v) => v.id === activeId)?.name || 'Unknown'}</strong>
          {' '} — auto-loads across all tabs.
          <button className={styles.deactivateBtn} onClick={handleDeactivate}>Clear</button>
        </div>
      )}

      {/* Add/edit form */}
      {showForm && (
        <div className={styles.form}>
          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>{editing ? 'Edit Resume' : 'New Resume Version'}</h3>
            <button className={styles.closeBtn} onClick={() => setShowForm(false)}>✕</button>
          </div>
          <input
            className={styles.nameInput}
            placeholder="Version name (e.g. Engineering Focus, Technical Sales)"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <textarea
            className="textarea"
            style={{ minHeight: 280 }}
            placeholder="Paste your full resume text here…"
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
          />
          <div className={styles.formActions}>
            <button className="btn-primary" onClick={handleSave}>
              {editing ? 'Save Changes' : 'Save Resume'}
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Version list */}
      {versions.length === 0 && !showForm ? (
        <div className={styles.empty}>
          <p>No resume versions saved yet.</p>
          <p>Create versions like "Engineering Focus" or "Technical Sales" to switch between them quickly.</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={openNew}>+ Create First Version</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {versions.map((v) => (
            <VersionCard
              key={v.id}
              version={v}
              isActive={v.id === activeId}
              onActivate={handleActivate}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
