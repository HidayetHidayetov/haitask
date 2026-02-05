/**
 * Jira REST client: create issue, assign, optional transition to status.
 * Jira Cloud REST API v3.
 */

const ASSIGN_DELAY_MS = 4000;
const DEFAULT_PROJECT_KEY = 'PROJ';
const DEFAULT_ISSUE_TYPE = 'Task';
const DEFAULT_TRANSITION_STATUS = 'Done';
const VALID_PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

const ASSIGNABLE_HINT =
  'In Jira Cloud the assignee must be an "Assignable user" in the project: Project → Space settings → People.';

function jiraHeaders(auth) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Basic ${auth}`,
  };
}

function plainTextToAdf(text) {
  const paragraphs = (text || '').trim().split(/\n+/).filter(Boolean);
  const content = paragraphs.length
    ? paragraphs.map((p) => ({ type: 'paragraph', content: [{ type: 'text', text: p }] }))
    : [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }];
  return { type: 'doc', version: 1, content };
}

function getAssigneeAccountId(config) {
  const fromConfig = (config?.jira?.assigneeAccountId || '').trim();
  if (fromConfig) return fromConfig;
  return (process.env.JIRA_ACCOUNT_ID || '').trim();
}

async function getMyselfAccountId(baseUrl, auth) {
  const res = await fetch(`${baseUrl}/rest/api/3/myself`, {
    headers: { Accept: 'application/json', Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira myself API ${res.status}: ${text || res.statusText}`);
  }
  const data = await res.json();
  const id = data?.accountId;
  if (!id) throw new Error('Jira myself response missing accountId.');
  return id;
}

async function verifyAssignee(baseUrl, issueKey, auth) {
  try {
    const res = await fetch(
      `${baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=assignee`,
      { headers: { Accept: 'application/json', Authorization: `Basic ${auth}` } }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return !!data?.fields?.assignee?.accountId;
  } catch {
    return false;
  }
}

async function assignIssue(baseUrl, issueKey, accountId, auth) {
  const id = (accountId || '').trim();
  if (!id) {
    return { ok: false, message: 'No assignee accountId. Set JIRA_ACCOUNT_ID in .env (full format: "712020:uuid").' };
  }

  const headers = jiraHeaders(auth);
  const assignUrl = `${baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}/assignee`;
  let res = await fetch(assignUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ accountId: id }),
  });

  if (res.ok) {
    const verified = await verifyAssignee(baseUrl, issueKey, auth);
    if (verified) return { ok: true };
    return { ok: false, message: `Assign API returned success but issue is still unassigned. ${ASSIGNABLE_HINT}` };
  }

  const body1 = await res.text();
  let lastError = `assignee endpoint ${res.status}: ${body1 || res.statusText}`;

  if (res.status === 400 || res.status === 404) {
    res = await fetch(`${baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ fields: { assignee: { accountId: id } } }),
    });
    if (res.ok) {
      const verified = await verifyAssignee(baseUrl, issueKey, auth);
      if (verified) return { ok: true };
      return { ok: false, message: `Assign API returned success but issue is still unassigned. ${ASSIGNABLE_HINT}` };
    }
    const body2 = await res.text();
    lastError += `; issue PUT ${res.status}: ${body2 || res.statusText}`;
  }

  return {
    ok: false,
    message: `Assign failed. ${lastError} ${ASSIGNABLE_HINT} Use JIRA_ACCOUNT_ID (full format with colon) in .env.`,
  };
}

/**
 * Transition issue to the given status (e.g. Done, To Do, In Progress).
 * Finds transition by destination status name (case-insensitive). No-op if status empty or not found.
 */
async function transitionToStatus(baseUrl, issueKey, auth, statusName) {
  const name = (statusName || '').trim();
  if (!name) return;

  const headers = jiraHeaders(auth);
  const transRes = await fetch(
    `${baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
    { headers: { Accept: 'application/json', Authorization: `Basic ${auth}` } }
  );
  if (!transRes.ok) return;
  const transData = await transRes.json();
  const transitions = transData?.transitions || [];
  const target = name.toLowerCase();
  const transition = transitions.find(
    (t) => (t.to?.name || '').toLowerCase() === target || (t.name || '').toLowerCase() === target
  );
  if (!transition?.id) return;
  await fetch(`${baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ transition: { id: transition.id } }),
  });
}

function normalizePriority(value) {
  const v = (value || '').trim();
  if (!v) return 'Medium';
  const cap = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  if (VALID_PRIORITIES.includes(cap)) return cap;
  if (['High', 'Medium', 'Low'].includes(cap)) return cap;
  return 'Medium';
}

/**
 * Create a Jira issue, assign, and optionally transition to a status.
 * @param {object} payload - { title, description, labels, priority }
 * @param {object} config - .haitaskrc (jira.baseUrl, projectKey, issueType, transitionToStatus)
 */
export async function createIssue(payload, config) {
  const baseUrl = (config?.jira?.baseUrl || process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email?.trim() || !token?.trim()) {
    throw new Error('Jira credentials missing. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in .env.');
  }

  const projectKey = config?.jira?.projectKey || DEFAULT_PROJECT_KEY;
  const issueType = config?.jira?.issueType || DEFAULT_ISSUE_TYPE;
  const rawStatus = config?.jira?.transitionToStatus;
  const transitionToStatusName =
    rawStatus === undefined || rawStatus === null ? DEFAULT_TRANSITION_STATUS : String(rawStatus).trim();
  const auth = Buffer.from(`${email}:${token}`, 'utf-8').toString('base64');

  let assigneeAccountId = getAssigneeAccountId(config);
  if (!assigneeAccountId) {
    assigneeAccountId = await getMyselfAccountId(baseUrl, auth);
  } else if (!assigneeAccountId.includes(':')) {
    assigneeAccountId = await getMyselfAccountId(baseUrl, auth);
  }

  const priorityName = normalizePriority(payload.priority);

  const baseFields = {
    project: { key: projectKey },
    summary: (payload.title || '').trim() || 'Untitled',
    description: plainTextToAdf(payload.description || ''),
    issuetype: { name: issueType },
    labels: Array.isArray(payload.labels) ? payload.labels.filter((l) => typeof l === 'string') : [],
    assignee: { accountId: assigneeAccountId },
  };

  let fields = { ...baseFields, priority: { name: priorityName } };
  let createRes = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: jiraHeaders(auth),
    body: JSON.stringify({ fields }),
  });

  if (!createRes.ok) {
    const firstErrorText = await createRes.text();
    if (createRes.status === 400) {
      const isPriority = /priority|Priority/i.test(firstErrorText);
      const isAssignee = /assignee|Assignee/i.test(firstErrorText);
      const retryFields = { ...baseFields };
      if (isAssignee) delete retryFields.assignee;
      if (isPriority) delete retryFields.priority;
      if (isPriority || isAssignee) {
        createRes = await fetch(`${baseUrl}/rest/api/3/issue`, {
          method: 'POST',
          headers: jiraHeaders(auth),
          body: JSON.stringify({ fields: retryFields }),
        });
      }
    }
    if (!createRes.ok) {
      const errText = createRes.bodyUsed ? firstErrorText : await createRes.text();
      throw new Error(`Jira API error ${createRes.status}: ${errText || createRes.statusText}`);
    }
  }

  const data = await createRes.json();
  const key = data?.key;
  if (!key) throw new Error('Jira API response missing issue key.');

  await new Promise((r) => setTimeout(r, ASSIGN_DELAY_MS));

  const assignResult = await assignIssue(baseUrl, key, assigneeAccountId, auth);
  if (!assignResult.ok) {
    throw new Error(`Issue ${key} created but assign failed. ${assignResult.message || ''}`);
  }

  await transitionToStatus(baseUrl, key, auth, transitionToStatusName);

  return { key, self: data.self };
}

/**
 * Add a comment to an existing Jira issue.
 * @param {string} issueKey - Issue key (e.g. PROJ-123)
 * @param {string} bodyText - Plain text comment
 * @param {object} config - .haitaskrc (jira.baseUrl)
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function addComment(issueKey, bodyText, config) {
  const baseUrl = (config?.jira?.baseUrl || process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!baseUrl || !email?.trim() || !token?.trim()) {
    throw new Error('Jira credentials missing. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in .env.');
  }
  const auth = Buffer.from(`${email}:${token}`, 'utf-8').toString('base64');
  const body = { body: plainTextToAdf(bodyText || '') };
  const res = await fetch(`${baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
    method: 'POST',
    headers: jiraHeaders(auth),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira comment API ${res.status}: ${text || res.statusText}`);
  }
  const url = `${baseUrl}/browse/${issueKey}`;
  return { key: issueKey, url };
}
