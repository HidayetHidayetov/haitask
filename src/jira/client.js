/**
 * Jira REST client: create issue + assign.
 * Jira Cloud REST API v3. Assignee via dedicated endpoint or issue PUT.
 */

/**
 * Convert plain text to Atlassian Document Format (ADF) for description field.
 */
function plainTextToAdf(text) {
  const paragraphs = (text || '').trim().split(/\n+/).filter(Boolean);
  const content = paragraphs.length
    ? paragraphs.map((p) => ({ type: 'paragraph', content: [{ type: 'text', text: p }] }))
    : [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }];
  return { type: 'doc', version: 1, content };
}

/**
 * Assign issue to user. Tries two methods for compatibility.
 * 1) PUT /rest/api/3/issue/{key}/assignee  body: { accountId }
 * 2) PUT /rest/api/3/issue/{key}           body: { fields: { assignee: { accountId } } }
 * If accountId looks like "number:uuid", also tries uuid-only (some instances expect that).
 * @returns {{ ok: boolean, message?: string }}
 */
async function assignIssue(baseUrl, issueKey, accountId, auth) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Basic ${auth}`,
  };

  const candidates = [accountId];
  if (accountId.includes(':')) {
    candidates.push(accountId.split(':').slice(-1)[0]);
  }

  let lastError = '';
  for (const id of candidates) {
    if (!id?.trim()) continue;

    const assignUrl = `${baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}/assignee`;
    let res = await fetch(assignUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ accountId: id }),
    });
    if (res.ok) return { ok: true };
    const body1 = await res.text();
    lastError = `assignee endpoint ${res.status}: ${body1 || res.statusText}`;

    if (res.status === 400 || res.status === 404) {
      const issueUrl = `${baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}`;
      res = await fetch(issueUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ fields: { assignee: { accountId: id } } }),
      });
      if (res.ok) return { ok: true };
      const body2 = await res.text();
      lastError = `assignee endpoint: ${body1}; issue PUT ${res.status}: ${body2 || res.statusText}`;
    }
  }

  return {
    ok: false,
    message: `Assign failed. ${lastError} Use JIRA_ACCOUNT_ID from Jira: Profile → Account ID, or admin.atlassian.com → Directory → Users → user → ID in URL. In .env use quotes if value has colon: JIRA_ACCOUNT_ID="...".`,
  };
}

/**
 * Read assignee accountId: config first, then .env.
 * .env: use quotes if value contains colon, e.g. JIRA_ACCOUNT_ID="712020:ffdf70f7-..."
 */
function getAssigneeAccountId(config) {
  const fromConfig = (config?.jira?.assigneeAccountId || '').trim();
  if (fromConfig) return fromConfig;
  const fromEnv = (process.env.JIRA_ACCOUNT_ID || '').trim();
  return fromEnv;
}

/**
 * Create a Jira issue and optionally assign to JIRA_ACCOUNT_ID.
 */
export async function createIssue(payload, config) {
  const baseUrl = (config?.jira?.baseUrl || process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email?.trim() || !token?.trim()) {
    throw new Error('Jira credentials missing. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in .env.');
  }

  const projectKey = config?.jira?.projectKey || 'PROJ';
  const issueType = config?.jira?.issueType || 'Task';
  const assigneeAccountId = getAssigneeAccountId(config);

  const fields = {
    project: { key: projectKey },
    summary: (payload.title || '').trim() || 'Untitled',
    description: plainTextToAdf(payload.description || ''),
    issuetype: { name: issueType },
    labels: Array.isArray(payload.labels) ? payload.labels.filter((l) => typeof l === 'string') : [],
  };

  const auth = Buffer.from(`${email}:${token}`, 'utf-8').toString('base64');
  const createRes = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({ fields }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Jira API error ${createRes.status}: ${text || createRes.statusText}`);
  }

  const data = await createRes.json();
  const key = data?.key;
  if (!key) throw new Error('Jira API response missing issue key.');

  if (assigneeAccountId) {
    const assignResult = await assignIssue(baseUrl, key, assigneeAccountId, auth);
    if (!assignResult.ok) {
      throw new Error(`Issue ${key} created but assign failed. ${assignResult.message || ''}`);
    }
  }

  return { key, self: data.self };
}
