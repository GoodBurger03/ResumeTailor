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

### 2. Configure API keys

**For security, API keys are entered through the app's Settings UI (not in .env files).**

```bash
cp .env.example .env
```

Open `.env` and set:

```
VITE_ANTHROPIC_API_KEY=your_key_here
VITE_STORAGE_ENCRYPTION_SECRET=a_big_secret_string_for_local_storage_encryption
```

**About VITE_STORAGE_ENCRYPTION_SECRET:**
This optional secret enables encryption of API keys stored in your browser's localStorage. When set, API keys entered through the Settings UI are obfuscated using XOR cipher + Base64 encoding. This protects against casual inspection via browser developer tools. Generate a long, random string (32+ characters) for best security.

**API Keys (enter these in the ⚙ Settings UI):**
- **Anthropic** (Required): [console.anthropic.com](https://console.anthropic.com) — Powers resume tailoring and cover letter generation
- **Adzuna** (Optional): [developer.adzuna.com](https://developer.adzuna.com) — Broad US job listings (250 req/month free)
- **The Muse** (Optional): [themuse.com/developers](https://www.themuse.com/developers/api/v2) — Tech and startup jobs (free)
- **USAJobs** (Optional): [developer.usajobs.gov](https://developer.usajobs.gov) — Federal government jobs (free, ~1 day approval)

> **Security Note:** API keys entered through the ⚙ Settings UI are encrypted in browser localStorage. The `.env` file is only used for development fallbacks and should not contain production API keys.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Configure API keys in the app

1. Click the ⚙ Settings tab
2. Enter your API keys in the secure input fields
3. Click "Save Settings"
4. Keys are encrypted and stored locally in your browser

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
