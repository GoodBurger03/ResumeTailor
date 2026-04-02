import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Tabs from './components/Tabs.jsx';
import ResumeTailor from './components/ResumeTailor.jsx';
import CoverLetter from './components/CoverLetter.jsx';
import JobBoard from './components/JobBoard.jsx';
import AppTracker from './components/AppTracker.jsx';
import Dashboard from './components/Dashboard.jsx';
import Settings from './components/Settings.jsx';
import { hasRequiredKeys } from './services/settings.js';
import styles from './App.module.css';

const TABS = [
  { id: 'jobs',     label: '⊞ Job Board' },
  { id: 'tailor',   label: '✦ Resume Tailor' },
  { id: 'cover',    label: '✉ Cover Letter' },
  { id: 'tracker',  label: '◎ Tracker' },
  { id: 'dash',     label: '▲ Dashboard' },
  { id: 'settings', label: '⚙ Settings' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [toast, setToast]         = useState({ visible: false, message: '' });
  const [prefillJD, setPrefillJD] = useState(null);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);

  // On first load, if no Anthropic key is set, nudge user to Settings
  useEffect(() => {
    if (!hasRequiredKeys()) {
      setShowKeyPrompt(true);
    }
  }, []);

  function showToast(message) {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 2200);
  }

  function handleTailorJob(job) {
    setPrefillJD({ title: job.title, company: job.company, desc: job.desc });
    setActiveTab('tailor');
  }

  function goToSettings() {
    setShowKeyPrompt(false);
    setActiveTab('settings');
  }

  return (
    <>
      <div className="app">
        <Header />

        {/* First-run prompt if no Anthropic key */}
        {showKeyPrompt && (
          <div className={styles.keyPrompt}>
            <div className={styles.keyPromptInner}>
              <span className={styles.keyPromptIcon}>🔑</span>
              <div>
                <strong>Add your Anthropic API key to get started.</strong>
                <span> The Resume Tailor and Cover Letter features need it.</span>
              </div>
              <button className={styles.keyPromptBtn} onClick={goToSettings}>
                Go to Settings →
              </button>
              <button className={styles.keyPromptDismiss} onClick={() => setShowKeyPrompt(false)}>
                ✕
              </button>
            </div>
          </div>
        )}

        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === 'jobs'     && <JobBoard     onTailorJob={handleTailorJob} onToast={showToast} />}
        {activeTab === 'tailor'   && <ResumeTailor onToast={showToast} prefillJD={prefillJD} />}
        {activeTab === 'cover'    && <CoverLetter  onToast={showToast} />}
        {activeTab === 'tracker'  && <AppTracker   onToast={showToast} />}
        {activeTab === 'dash'     && <Dashboard />}
        {activeTab === 'settings' && <Settings     onToast={showToast} />}
      </div>

      <div className={`toast ${toast.visible ? 'show' : ''}`}>
        {toast.message}
      </div>
    </>
  );
}
