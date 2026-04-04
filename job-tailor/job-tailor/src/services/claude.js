/**
 * Claude API client.
 * Production: routes through job-tailor-api Azure Function (VITE_API_URL set).
 * Development: falls back to direct Anthropic call using key from Settings.
 */

const API_URL       = import.meta.env.VITE_API_URL;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL         = 'claude-sonnet-4-20250514';

async function callViaBackend(mode, systemPrompt, userMessage, maxTokens) {
  const res = await fetch(`${API_URL}/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, systemPrompt, userMessage, maxTokens }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.content;
}

async function callDirect(systemPrompt, userMessage, maxTokens) {
  const { getAnthropicKey } = await import('./settings.js');
  const apiKey = getAnthropicKey();
  if (!apiKey) throw new Error('No Anthropic API key. Add it in ⚙ Settings.');

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system: systemPrompt, messages: [{ role: 'user', content: userMessage }] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

export default async function callClaude(systemPrompt, userMessage, maxTokens = 1000, mode = 'tailor') {
  return API_URL
    ? callViaBackend(mode, systemPrompt, userMessage, maxTokens)
    : callDirect(systemPrompt, userMessage, maxTokens);
}
