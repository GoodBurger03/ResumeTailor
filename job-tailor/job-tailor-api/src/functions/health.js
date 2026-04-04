import { app } from '@azure/functions';
import { getCorsHeaders, handlePreflight, successResponse } from '../middleware/cors.js';

app.http('health', {
  methods:   ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'health',

  async handler(request, context) {
    const preflight = handlePreflight(request);
    if (preflight) return preflight;

    const corsHeaders = getCorsHeaders(request.headers.get('origin') || '');

    const sources = {
      adzuna:  !!(process.env.ADZUNA_APP_ID  && process.env.ADZUNA_APP_KEY),
      muse:    !!process.env.MUSE_API_KEY,
      usajobs: !!(process.env.USAJOBS_API_KEY && process.env.USAJOBS_USER_AGENT),
      claude:  !!process.env.ANTHROPIC_API_KEY,
    };

    return successResponse({
      status:    'ok',
      version:   '1.0.0',
      timestamp: new Date().toISOString(),
      sources,
    }, corsHeaders);
  },
});
