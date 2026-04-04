# JobTailor

JobTailor is a full-stack job search platform with a React frontend and an Azure Functions API backend.

## Current Repository Layout

```text
ResumeTailor/
├── .github/
├── job-tailor/
│   └── job-tailor/                 # Frontend (React + Vite)
│       ├── .env
│       ├── .env.example
│       ├── package.json
│       └── src/
└── job-tailor-api/                 # Backend (Azure Functions)
    ├── local.settings.json.example
    ├── package.json
    └── src/
```

## Features

- Resume tailoring with AI scoring and bullet rewrites.
- Cover letter generation.
- Job aggregation from Adzuna, The Muse, USAJobs, and RemoteOK.
- Application tracking and dashboard views.

## Architecture

```text
Frontend (Vite, localhost:5173 or deployed static site)
    |
    v
Backend API (Azure Functions, /api/*)
    |
    v
External providers (Anthropic, Adzuna, Muse, USAJobs, RemoteOK)
```

## Local Setup (Recommended)

### 1. Prerequisites

- Node.js 20+
- npm
- Azure Functions Core Tools v4

Install Functions Core Tools (Windows):

```powershell
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

### 2. Install dependencies

```powershell
cd job-tailor\job-tailor
npm install

cd ..\..\job-tailor-api
npm install
```

### 3. Configure backend secrets

Copy backend settings file:

```powershell
cd job-tailor-api
Copy-Item local.settings.json.example local.settings.json
```

Open `job-tailor-api/local.settings.json` and set real values for:

- `ANTHROPIC_API_KEY`
- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`
- `MUSE_API_KEY`
- `USAJOBS_API_KEY`
- `USAJOBS_USER_AGENT`
- `ALLOWED_ORIGIN` (for local: `http://localhost:5173`)

### 4. Configure frontend

Open `job-tailor/job-tailor/.env` and set:

```env
VITE_API_URL=http://localhost:7071/api
```

When `VITE_API_URL` is set, the frontend sends all provider calls through the backend.

### 5. Run both apps

Terminal 1:

```powershell
cd job-tailor-api
func start
```

Terminal 2:

```powershell
cd job-tailor\job-tailor
npm run dev
```

Frontend: `http://localhost:5173`

Backend health check:

```powershell
curl -UseBasicParsing http://localhost:7071/api/health
```

## Production Deployment

### Backend (Azure Functions)

Deploy `job-tailor-api` to Azure Functions.

- Add all secrets as Function App environment variables.
- Set `ALLOWED_ORIGIN` to your deployed frontend URL.

### Frontend (Static Host)

Deploy `job-tailor/job-tailor` to a static host (Vercel, Netlify, Azure Static Web Apps, etc).

Set build-time env:

```env
VITE_API_URL=https://<your-function-app>.azurewebsites.net/api
```

## Security Notes

- Do not commit `job-tailor-api/local.settings.json`.
- Keep provider keys on the backend only for production.
- Rotate exposed keys immediately if they are ever shared in logs, screenshots, or chat.

## Useful Paths

- Frontend app: `job-tailor/job-tailor`
- Backend API: `job-tailor-api`
- Backend jobs function: `job-tailor-api/src/functions/jobs.js`
- Backend CORS middleware: `job-tailor-api/src/middleware/cors.js`
