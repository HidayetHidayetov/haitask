/**
 * OpenAI provider: commit + context → strict JSON task payload.
 * Response must be { title, description, labels }. Invalid JSON → fail gracefully.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Build system + user prompt from commit data.
 * @param {{ message: string, branch: string, repoName: string }} commitData
 * @returns {{ system: string, user: string }}
 */
function buildPrompt(commitData) {
  const { message, branch, repoName } = commitData;
  const system = `You generate a Jira task from a Git commit. Reply with a single JSON object only, no markdown or extra text. Keys: "title" (short summary, string), "description" (detailed description, string), "labels" (array of strings, e.g. ["auto", "commit"]).`;
  const user = `Repo: ${repoName}\nBranch: ${branch}\nCommit message:\n${message}\n\nGenerate the JSON object.`;
  return { system, user };
}

/**
 * Parse and validate AI response. Expects { title, description, labels }.
 * @param {string} raw
 * @returns {{ title: string, description: string, labels: string[] }}
 * @throws {Error} If invalid JSON or missing/ wrong types
 */
function parseTaskPayload(raw) {
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (err) {
    throw new Error(`AI response is not valid JSON: ${err.message}`);
  }
  if (typeof obj.title !== 'string' || typeof obj.description !== 'string') {
    throw new Error('AI response missing or invalid title/description (must be strings).');
  }
  if (!Array.isArray(obj.labels)) {
    throw new Error('AI response labels must be an array of strings.');
  }
  const labels = obj.labels.filter((l) => typeof l === 'string');
  return { title: obj.title.trim(), description: obj.description.trim(), labels };
}

/**
 * Call OpenAI and return task payload for Jira.
 * @param {{ message: string, branch: string, repoName: string }} commitData
 * @param {{ ai: { model?: string } }} config - config.ai.model (default gpt-4o-mini)
 * @returns {Promise<{ title: string, description: string, labels: string[] }>}
 * @throws {Error} On missing API key, HTTP error, or invalid JSON response
 */
export async function generateTaskPayload(commitData, config) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY is not set. Add it to .env.');
  }

  const model = config?.ai?.model || 'gpt-4o-mini';
  const { system, user } = buildPrompt(commitData);

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
    throw new Error('OpenAI response missing choices[0].message.content');
  }

  return parseTaskPayload(content.trim());
}
