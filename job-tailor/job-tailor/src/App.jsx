import { useState } from 'react';
import Header from './components/Header.jsx';
import Tabs from './components/Tabs.jsx';
import ResumeTailor from './components/ResumeTailor.jsx';
import CoverLetter from './components/CoverLetter.jsx';

const TABS = [
  { id: 'tailor', label: '✦ Resume Tailor' },
  { id: 'cover',  label: '✉ Cover Letter' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('tailor');
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  function showToast(message) {
    setToast(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }

  return (
    <>
      <div className="app">
        <Header />
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === 'tailor' && <ResumeTailor onToast={showToast} />}
        {activeTab === 'cover'  && <CoverLetter  onToast={showToast} />}
      </div>

      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toast}</div>
    </>
  );
}
