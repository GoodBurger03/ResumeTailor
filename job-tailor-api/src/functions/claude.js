import { app } from '@azure/functions';
import axios from 'axios';
import { getCorsHeaders, handlePreflight, isRateLimited, getClientIp, errorResponse, successResponse } from '../middleware/cors.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL         = 'claude-sonnet-4-20250514';
const MAX_TOKENS    = 2000;

// Allowed system prompt types — prevents prompt injection abuse
const ALLOWED_MODES = new Set([
  'tailor', 'cover_letter', 'interview_prep',
  'salary_insights', 'follow_up_email', 'jd_analyze',
]);

app.http('claude', {
  methods:   ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'claude',

  async handler(request, context) {
    context.log('Claude proxy function triggered');

    const preflight = handlePreflight(request);
    if (preflight) return preflight;

    const corsHeaders = getCorsHeaders(request.headers.get('origin') || '');

    // Rate limiting — tighter for AI calls
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return errorResponse(429, 'Too many requests. Please wait a moment.', corsHeaders);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      context.error('ANTHROPIC_API_KEY not configured');
      return errorResponse(500, 'AI service not configured.', corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, 'Invalid JSON body.', corsHeaders);
    }

    const { mode, systemPrompt, userMessage, maxTokens } = body;

    // Validate mode to prevent abuse
    if (!ALLOWED_MODES.has(mode)) {
      return errorResponse(400, `Invalid mode. Allowed: ${[...ALLOWED_MODES].join(', ')}`, corsHeaders);
    }

    if (!userMessage?.trim()) {
      return errorResponse(400, 'userMessage is required.', corsHeaders);
    }

    context.log(`Claude call — mode: ${mode}, tokens: ${maxTokens || MAX_TOKENS}`);

    try {
      const { data } = await axios.post(
        ANTHROPIC_URL,
        {
          model:      MODEL,
          max_tokens: Math.min(maxTokens || MAX_TOKENS, MAX_TOKENS),
          system:     systemPrompt,
          messages:   [{ role: 'user', content: userMessage }],
        },
        {
          headers: {
            'Content-Type':      'application/json',
            'x-api-key':         apiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: 60000,
        }
      );

      return successResponse({ content: data.content[0].text }, corsHeaders);

    } catch (e) {
      const status  = e.response?.status;
      const message = e.response?.data?.error?.message || e.message;
      context.error(`Anthropic error ${status}:`, message);

      if (status === 401) return errorResponse(401, 'Invalid Anthropic API key.', corsHeaders);
      if (status === 429) return errorResponse(429, 'AI rate limit reached. Please wait.', corsHeaders);
      return errorResponse(500, `AI error: ${message}`, corsHeaders);
    }
  },
});
