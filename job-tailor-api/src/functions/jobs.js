import { app } from '@azure/functions';
import { fetchAdzuna, fetchMuse, fetchUSAJobs, fetchRemoteOK, dedupe } from '../lib/jobFetcher.js';
import { getCorsHeaders, handlePreflight, isRateLimited, getClientIp, errorResponse, successResponse } from '../middleware/cors.js';
import NodeCache from 'node-cache';

// Cache results for 10 minutes to reduce API calls and improve response time
const jobCache = new NodeCache({ stdTTL: 600 });

app.http('jobs', {
  methods:   ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'jobs',

  async handler(request, context) {
    context.log('Jobs function triggered');

    // CORS preflight
    const preflight = handlePreflight(request);
    if (preflight) return preflight;

    const corsHeaders = getCorsHeaders(request.headers.get('origin') || '');

    // Rate limiting
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return errorResponse(429, 'Too many requests. Please wait a moment.', corsHeaders);
    }

    const location  = request.query.get('location') || '';
    const bustCache = request.query.get('refresh') === 'true';
    const cacheKey  = `jobs:${location}`;

    // Return cached results if available
    if (!bustCache) {
      const cached = jobCache.get(cacheKey);
      if (cached) {
        context.log(`Cache hit for key: ${cacheKey}`);
        return successResponse({ jobs: cached, cached: true, total: cached.length }, corsHeaders);
      }
    }

    context.log(`Fetching jobs for location: "${location || 'nationwide'}"`);

    try {
      const [adzuna, muse, usa, remoteOk] = await Promise.all([
        fetchAdzuna(location),
        fetchMuse(),
        fetchUSAJobs(location),
        fetchRemoteOK(),
      ]);

      const sourceCounts = {
        adzuna:   adzuna.length,
        muse:     muse.length,
        usajobs:  usa.length,
        remoteok: remoteOk.length,
      };

      context.log('Source counts:', sourceCounts);

      const all  = dedupe([...adzuna, ...muse, ...usa, ...remoteOk]);
      const jobs = all.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));

      // Cache the results
      jobCache.set(cacheKey, jobs);

      return successResponse({
        jobs,
        total:        jobs.length,
        cached:       false,
        sourceCounts,
      }, corsHeaders);

    } catch (e) {
      context.error('Jobs fetch error:', e);
      return errorResponse(500, 'Failed to fetch jobs. Please try again.', corsHeaders);
    }
  },
});
