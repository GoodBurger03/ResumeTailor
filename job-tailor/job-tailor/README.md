# JobTailor

AI-powered resume tailoring and cover letter generator. Paste a job description and your resume — get a match score, keyword gap analysis, rewritten bullets, and a tailored cover letter in seconds.

---

## Features

- **Resume Tailor** — match score (0–100), strong vs. missing keywords, 5 rewritten resume bullets optimized for the JD, and 3 actionable recommendations
- **Cover Letter** — generates a natural, tailored cover letter in your voice; one-click copy

---

## Tech Stack

- React 18 + Vite
- CSS Modules
- Anthropic Claude API (`claude-sonnet-4-20250514`)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/job-tailor.git
cd job-tailor
npm install
```

### 2. Add your API key

```bash
cp .env.example .env
```

Open `.env` and set:

```
VITE_ANTHROPIC_API_KEY=your_key_here
```

Get a key at [console.anthropic.com](https://console.anthropic.com).

> **Note:** This app calls the Anthropic API directly from the browser. This is fine for local/personal use. For a production deployment, proxy API calls through a backend server to keep your key private.

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
    ├── App.jsx                     # Root component, tab state, toast
    ├── services/
    │   ├── claude.js               # Anthropic API wrapper
    │   └── analysis.js             # tailorResume() + generateCoverLetter()
    ├── styles/
    │   ├── globals.css             # Design tokens, reset, keyframes
    │   └── components.css          # Shared utility classes
    └── components/
        ├── Header.jsx / .module.css
        ├── Tabs.jsx / .module.css
        ├── ScoreRing.jsx / .module.css
        ├── ResumeTailor.jsx / .module.css
        └── CoverLetter.jsx / .module.css
```

---

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Deploy to Vercel, Netlify, or any static host.

---

## Future ideas

- Application tracker (save jobs + status)
- Salary benchmarker
- Follow-up email drafter
- Tone selector for cover letters
