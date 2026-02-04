/**
 * Groq provider (free tier, fast inference).
 * API: https://api.groq.com/openai/v1/chat/completions (OpenAI-compatible)
 * Docs: https://console.groq.com/docs
 */

import { buildPrompt, parseTaskPayload } from './utils.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Call Groq and return task payload for Jira.
 * @param {{ message: string, branch: string, repoName: string }} commitData
 * @param {{ ai: { model?: string } }} config
 * @returns {Promise<{ title: string, description: string, labels: string[] }>}
 */
export async function generateGroq(commitData, config) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error(
      'GROQ_API_KEY is not set. Add it to .env. Get free key at https://console.groq.com/keys'
    );
  }

  const model = config?.ai?.model || 'llama-3.1-8b-instant';
  const { system, user } = buildPrompt(commitData);

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq API error ${response.status}: ${body || response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Groq response missing choices[0].message.content');
  }

  return parseTaskPayload(content.trim());
}
