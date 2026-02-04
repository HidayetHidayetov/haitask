/**
 * Jira REST client: create issue.
 * Isolated from CLI and AI. Uses Jira Cloud REST API v3.
 */

/**
 * Convert plain text to Atlassian Document Format (ADF) for description field.
 * @param {string} text
 * @returns {object} ADF doc
 */
function plainTextToAdf(text) {
  const paragraphs = (text || '').trim().split(/\n+/).filter(Boolean);
  const content = paragraphs.map((p) => ({
    type: 'paragraph',
    content: [{ type: 'text', text: p }],
  }));
  if (content.length === 0) {
    content.push({ type: 'paragraph', content: [{ type: 'text', text: '' }] });
  }
  return { type: 'doc', version: 1, content };
}

/**
 * Create a Jira issue.
 * @param {{ title: string, description: string, labels: string[] }} payload - From AI (title → summary)
 * @param {object} config - config.jira: baseUrl, projectKey, issueType
 * @returns {Promise<{ key: string, self?: string }>} Created issue key (and self URL if returned)
 * @throws {Error} On missing env, HTTP error, or invalid response
 */
export async function createIssue(payload, config) {
  // Spec: .haitaskrc is the source of truth for Jira baseUrl.
  // .env should hold credentials (email/token), not routing.
  const baseUrl = (config?.jira?.baseUrl || process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email?.trim() || !token?.trim()) {
    throw new Error('Jira credentials missing. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in .env.');
  }

  const projectKey = config?.jira?.projectKey || 'PROJ';
  const issueType = config?.jira?.issueType || 'Task';

  const body = {
    fields: {
      project: { key: projectKey },
      summary: (payload.title || '').trim() || 'Untitled',
      description: plainTextToAdf(payload.description || ''),
      issuetype: { name: issueType },
      labels: Array.isArray(payload.labels) ? payload.labels.filter((l) => typeof l === 'string') : [],
    },
  };

  const url = `${baseUrl}/rest/api/3/issue`;
  const auth = Buffer.from(`${email}:${token}`, 'utf-8').toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API error ${response.status}: ${text || response.statusText}`);
  }

  const data = await response.json();
  const key = data?.key;
  if (!key) {
    throw new Error('Jira API response missing issue key.');
  }

  return { key, self: data.self };
}
