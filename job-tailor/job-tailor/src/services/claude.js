import { getAnthropicKey } from './settings.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-sonnet-4-20250514';

async function callClaude(systemPrompt, userMessage, maxTokens = 1000) {
  const apiKey = getAnthropicKey();

  if (!apiKey) {
    throw new Error(
      'No Anthropic API key found. Go to ⚙ Settings and paste your key from console.anthropic.com.'
    );
  }

  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: maxTokens,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userMessage }],
      }),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Request setup failed. Re-save your API key in Settings and try again.');
    }
    throw error;
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export default callClaude;
