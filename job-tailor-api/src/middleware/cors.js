/**
 * Shared middleware for all Azure Functions.
 * Handles CORS, rate limiting, and request validation.
 */

import NodeCache from 'node-cache';

// Simple in-memory rate limiter (resets on cold start — fine for serverless)
const rateLimitCache = new NodeCache({ stdTTL: 60 });

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '30');

/**
 * Returns CORS headers for a given request origin.
 */
export function getCorsHeaders(requestOrigin) {
  const origin = ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age':       '86400',
  };
}

/**
 * Handle OPTIONS preflight requests.
 */
export function handlePreflight(request) {
  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: getCorsHeaders(request.headers.get('origin') || ''),
      body: '',
    };
  }
  return null;
}

/**
 * Rate limit by IP. Returns true if request should be blocked.
 */
export function isRateLimited(ip) {
  const key   = `rl:${ip}`;
  const count = (rateLimitCache.get(key) || 0) + 1;
  rateLimitCache.set(key, count, rateLimitCache.getTtl(key) ? undefined : 60);
  return count > RATE_LIMIT;
}

/**
 * Get client IP from Azure Functions request.
 */
export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('client-ip') ||
    'unknown'
  );
}

/**
 * Standard error response.
 */
export function errorResponse(status, message, corsHeaders = {}) {
  return {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    body: JSON.stringify({ error: message }),
  };
}

/**
 * Standard success response.
 */
export function successResponse(data, corsHeaders = {}) {
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    body: JSON.stringify(data),
  };
}
