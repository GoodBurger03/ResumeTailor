# JobTailor

AI-powered job search platform with resume tailoring, cover letter generation, job aggregation, and application tracking. Built for job seekers who want to optimize their applications and stay organized.

---

## Features

- **✦ Resume Tailor** — Paste a job description and your resume. Get a match score (0–100), identify skill gaps, receive 5 AI-optimized resume bullets tailored to the role, and 3 actionable recommendations
- **✉ Cover Letter Generator** — Creates natural, compelling cover letters in seconds with one-click copy
- **⊞ Job Board** — Aggregates job listings from multiple sources: Adzuna (broad US), The Muse (tech/startup), USAJobs (federal), and RemoteOK (remote tech)
- **◎ Application Tracker** — Log and track every application with status updates, notes, and follow-ups
- **▲ Dashboard** — Visual analytics of your job search progress, application pipeline, and success metrics
- **⚙ Settings** — Manage API keys for all integrated services with local storage
- **📄 Export** — Download tailored resumes and cover letters as PDF or DOCX

---

## Tech Stack

- React 18 + Vite
- CSS Modules with custom design system
- Anthropic Claude API for AI-powered content generation
- Multiple job board APIs (Adzuna, The Muse, USAJobs, RemoteOK)
- Local storage for data persistence
- PDF/DOCX export capabilities

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/GoodBurger03/job-tailor.git
cd job-tailor/job-tailor
npm install
```

### 2. Add your API keys

```bash
cp .env.example .env
```

Open `.env` and set:

```
VITE_ANTHROPIC_API_KEY=your_key_here
VITE_ADZUNA_APP_ID=your_adzuna_app_id
VITE_ADZUNA_APP_KEY=your_adzuna_app_key
VITE_MUSE_API_KEY=your_muse_key
VITE_USAJOBS_API_KEY=your_usajobs_key
```

**API Keys:**
- **Anthropic** (Required): [console.anthropic.com](https://console.anthropic.com) — Powers resume tailoring and cover letter generation
- **Adzuna** (Optional): [developer.adzuna.com](https://developer.adzuna.com) — Broad US job listings (250 req/month free)
- **The Muse** (Optional): [themuse.com/developers](https://www.themuse.com/developers/api/v2) — Tech and startup jobs (free)
- **USAJobs** (Optional): [developer.usajobs.gov](https://developer.usajobs.gov) — Federal government jobs (free, ~1 day approval)

> **Note:** This app calls APIs directly from the browser. Keys are stored locally in your browser. For production deployment, proxy API calls through a backend server to keep keys private.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Project Structure

```
job-tailor/
├── index.html
├── vite.config.js
├── package.json
├── .env.example
├── .gitignore
└── src/
    ├── main.jsx                    # React entry point
    ├── App.jsx                     # Root component, tab navigation, toast notifications
    ├── services/
    │   ├── claude.js               # Anthropic API wrapper
    │   ├── analysis.js             # Resume tailoring + cover letter generation
    │   ├── jobFeed.js              # Job aggregation from multiple APIs
    │   ├── settings.js             # API key management (localStorage + .env)
    │   ├── storage.js              # Local storage utilities
    │   └── export.js               # PDF/DOCX export functionality
    ├── styles/
    │   ├── globals.css             # Design tokens, reset, keyframes
    │   └── components.css          # Shared utility classes
    └── components/
        ├── Header.jsx / .module.css
        ├── Tabs.jsx / .module.css
        ├── JobBoard.jsx / .module.css
        ├── ResumeTailor.jsx / .module.css
        ├── CoverLetter.jsx / .module.css
        ├── AppTracker.jsx / .module.css
        ├── Dashboard.jsx / .module.css
        ├── Settings.jsx / .module.css
        └── ScoreRing.jsx / .module.css
```

---

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Deploy to Vercel, Netlify, or any static host.
- Tone selector for cover letters
