import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import ResumeTailor from './components/ResumeTailor.jsx';
import CoverLetter from './components/CoverLetter.jsx';
import JobBoard from './components/JobBoard.jsx';
import AppTracker from './components/AppTracker.jsx';
import Dashboard from './components/Dashboard.jsx';
import Settings from './components/Settings.jsx';
import InterviewPrep from './components/InterviewPrep.jsx';
import SalaryInsights from './components/SalaryInsights.jsx';
import EmailDrafter from './components/EmailDrafter.jsx';
import ResumeManager from './components/ResumeManager.jsx';
import { hasRequiredKeys } from './services/settings.js';
import styles from './App.module.css';

const TAB_TITLES = {
  jobs:      'Job Board',
  tailor:    'Resume Tailor',
  cover:     'Cover Letter',
  interview: 'Interview Prep',
  email:     'Email Drafter',
  salary:    'Salary Insights',
  resumes:   'My Resumes',
  tracker:   'Application Tracker',
  dash:      'Dashboard',
  settings:  'Settings',
};

export default function App() {
  const [activeTab, setActiveTab]         = useState('jobs');
  const [toast, setToast]                 = useState({ visible: false, message: '' });
  const [prefillJD, setPrefillJD]         = useState(null);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);

  useEffect(() => {
    if (!hasRequiredKeys()) setShowKeyPrompt(true);
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
    <div className={styles.layout}>
      <Sidebar active={activeTab} onChange={setActiveTab} />

      <div className={styles.main}>
        {/* Key prompt banner */}
        {showKeyPrompt && (
          <div className={styles.keyPrompt}>
            <span>🔑 <strong>Add your Anthropic API key</strong> to unlock AI features.</span>
            <button className={styles.keyPromptBtn} onClick={goToSettings}>Go to Settings →</button>
            <button className={styles.keyPromptDismiss} onClick={() => setShowKeyPrompt(false)}>✕</button>
          </div>
        )}

        {/* Page header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>{TAB_TITLES[activeTab]}</h1>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {activeTab === 'jobs'      && <JobBoard      onTailorJob={handleTailorJob} onToast={showToast} />}
          {activeTab === 'tailor'    && <ResumeTailor  onToast={showToast} prefillJD={prefillJD} />}
          {activeTab === 'cover'     && <CoverLetter   onToast={showToast} />}
          {activeTab === 'interview' && <InterviewPrep onToast={showToast} />}
          {activeTab === 'email'     && <EmailDrafter  onToast={showToast} />}
          {activeTab === 'salary'    && <SalaryInsights onToast={showToast} />}
          {activeTab === 'resumes'   && <ResumeManager  onToast={showToast} />}
          {activeTab === 'tracker'   && <AppTracker    onToast={showToast} />}
          {activeTab === 'dash'      && <Dashboard />}
          {activeTab === 'settings'  && <Settings      onToast={showToast} />}
        </div>
      </div>

      <div className={`toast ${toast.visible ? 'show' : ''}`}>{toast.message}</div>
    </div>
  );
}
