/**
 * OpenAI provider implementation.
 */

import { buildPrompt, parseTaskPayload } from './utils.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Call OpenAI and return task payload for the configured target.
 * @param {{ message: string, branch: string, repoName: string }} commitData
 * @param {{ ai: { model?: string } }} config
 * @returns {Promise<{ title: string, description: string, labels: string[] }>}
 */
export async function generateOpenAI(commitData, config) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY is not set. Add it to .env.');
  }

  const model = config?.ai?.model || 'gpt-4o-mini';
  const { system, user } = buildPrompt(commitData, config?.target);

  const response = await fetch(OPENAI_API_URL, {
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
    throw new Error(`OpenAI API error ${response.status}: ${body || response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new TypeError('OpenAI response missing choices[0].message.content');
  }

  return parseTaskPayload(content.trim());
}
