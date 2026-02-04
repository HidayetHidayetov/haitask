/**
 * Deepseek Chat provider (free tier, JSON mode supported).
 * API: https://api.deepseek.com/v1/chat/completions
 * Docs: https://platform.deepseek.com/api-docs/
 */

import { buildPrompt, parseTaskPayload } from './utils.js';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * Call Deepseek and return task payload for Jira.
 * @param {{ message: string, branch: string, repoName: string }} commitData
 * @param {{ ai: { model?: string } }} config
 * @returns {Promise<{ title: string, description: string, labels: string[] }>}
 */
export async function generateDeepseek(commitData, config) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('DEEPSEEK_API_KEY is not set. Add it to .env. Get free key at https://platform.deepseek.com/');
  }

  const model = config?.ai?.model || 'deepseek-chat';
  const { system, user } = buildPrompt(commitData);

  const response = await fetch(DEEPSEEK_API_URL, {
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
    throw new Error(`Deepseek API error ${response.status}: ${body || response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Deepseek response missing choices[0].message.content');
  }

  return parseTaskPayload(content.trim());
}
