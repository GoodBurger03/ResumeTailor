# job-tailor-api

Azure Functions backend for [JobTailor](https://github.com/GoodBurger03/job-tailor).
Proxies all external API calls server-side — no CORS issues, no API keys in the browser.

## Architecture

```
Frontend (React/Vite)
        │
        ▼
Azure Functions (this repo)
        │
        ├── /api/jobs    → Adzuna, The Muse, USAJobs, RemoteOK
        ├── /api/claude  → Anthropic Claude API
        └── /api/health  → Status check
```

## Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/jobs` | Fetch job listings from all sources |
| GET | `/api/jobs?location=NYC` | Filter by location |
| GET | `/api/jobs?refresh=true` | Bust cache and re-fetch |
| POST | `/api/claude` | Proxy Anthropic API calls |
| GET | `/api/health` | Check which API keys are configured |

## Local Development

### Prerequisites
- Node.js 18+
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
  ```bash
  npm install -g azure-functions-core-tools@4 --unsafe-perm true
  ```

### Setup

```bash
git clone https://github.com/GoodBurger03/job-tailor-api.git
cd job-tailor-api
npm install

# Copy settings and add your API keys
cp local.settings.json.example local.settings.json
# Edit local.settings.json with your keys

# Start the functions locally
func start
```

Functions will be available at `http://localhost:7071/api/`.

### Test the health endpoint
```bash
curl http://localhost:7071/api/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "sources": {
    "adzuna": true,
    "muse": true,
    "usajobs": true,
    "claude": true
  }
}
```

## Deploying to Azure

### 1. Create an Azure account
Sign up at [azure.microsoft.com](https://azure.microsoft.com) — free tier includes 1M function calls/month.

### 2. Install Azure CLI
```bash
# macOS
brew install azure-cli

# Windows
winget install Microsoft.AzureCLI
```

### 3. Login and create resources
```bash
az login

# Create resource group
az group create --name job-tailor-rg --location eastus

# Create storage account (required for Functions)
az storage account create \
  --name jobtailorstorage \
  --location eastus \
  --resource-group job-tailor-rg \
  --sku Standard_LRS

# Create the Function App
az functionapp create \
  --resource-group job-tailor-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name job-tailor-api \
  --storage-account jobtailorstorage
```

### 4. Set environment variables on Azure
```bash
az functionapp config appsettings set \
  --name job-tailor-api \
  --resource-group job-tailor-rg \
  --settings \
    ANTHROPIC_API_KEY="your_key" \
    ADZUNA_APP_ID="your_id" \
    ADZUNA_APP_KEY="your_key" \
    MUSE_API_KEY="your_key" \
    USAJOBS_API_KEY="your_key" \
    USAJOBS_USER_AGENT="your@email.com" \
    ALLOWED_ORIGIN="https://your-frontend-url.com"
```

### 5. Deploy
```bash
func azure functionapp publish job-tailor-api
```

Your API will be live at:
`https://job-tailor-api.azurewebsites.net/api/`

### 6. Update the frontend
In your frontend repo, set `VITE_API_URL` in your `.env`:
```
VITE_API_URL=https://job-tailor-api.azurewebsites.net/api
```

## API Keys Reference

| Service | Where to get it | Cost |
|---------|----------------|------|
| Anthropic | [console.anthropic.com](https://console.anthropic.com) | Pay per use |
| Adzuna | [developer.adzuna.com](https://developer.adzuna.com) | Free (250 req/month) |
| The Muse | [themuse.com/developers](https://www.themuse.com/developers/api/v2) | Free |
| USAJobs | [developer.usajobs.gov](https://developer.usajobs.gov) | Free |

## Rate Limiting

Built-in rate limiting: 30 requests/minute per IP. Configurable via `RATE_LIMIT_PER_MINUTE` env var.

## Caching

Job results are cached in-memory for 10 minutes to reduce API calls and improve response time.
Cache is per-location. Pass `?refresh=true` to force a fresh fetch.

## Tech Stack

- **Runtime**: Node.js 18
- **Framework**: Azure Functions v4
- **HTTP client**: Axios
- **Caching**: node-cache (in-memory)
- **Deployment**: Azure App Service (Consumption plan)
