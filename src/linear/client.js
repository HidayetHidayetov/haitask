/**
 * Linear GraphQL client: create issue (task).
 * API: https://api.linear.app/graphql
 */

import { getHttpHint } from '../utils/http-hints.js';

const LINEAR_GRAPHQL = 'https://api.linear.app/graphql';

const CREATE_ISSUE_MUTATION = `
  mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      issue { identifier url }
    }
  }
`;

const TEAM_LABELS_QUERY = `
  query TeamLabels($teamId: String!) {
    team(id: $teamId) {
      labels {
        nodes { id name }
      }
    }
  }
`;

function toLinearPriority(priority) {
  const p = (priority || '').trim();
  if (p === 'Highest') return 1;
  if (p === 'High') return 2;
  if (p === 'Low' || p === 'Lowest') return 4;
  return 3;
}

async function resolveLinearLabelIds(apiKey, teamId, labels) {
  const desired = (Array.isArray(labels) ? labels : [])
    .filter((v) => typeof v === 'string' && v.trim())
    .map((v) => v.trim().toLowerCase());
  if (desired.length === 0) return [];

  try {
    const res = await fetch(LINEAR_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: TEAM_LABELS_QUERY,
        variables: { teamId },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const nodes = data?.data?.team?.labels?.nodes;
    if (!Array.isArray(nodes)) return [];

    const byName = new Map();
    for (const node of nodes) {
      const key = typeof node?.name === 'string' ? node.name.trim().toLowerCase() : '';
      if (key && typeof node?.id === 'string') byName.set(key, node.id);
    }
    return desired.map((name) => byName.get(name)).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Create a Linear issue from AI payload. Same interface as Jira/Trello: returns { key, url }.
 * @param {object} payload - { title, description, labels, priority } from AI
 * @param {object} config - .haitaskrc (linear.teamId)
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function createTask(payload, config) {
  const apiKey = process.env.LINEAR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'LINEAR_API_KEY is not set. Add it to .env. Get a key at https://linear.app/settings/api'
    );
  }

  const linear = config?.linear || {};
  const teamId = linear.teamId?.trim();
  if (!teamId) {
    throw new Error('Linear team ID missing. Set linear.teamId in .haitaskrc.');
  }

  const title = (payload?.title || '').trim() || 'Untitled';
  const description = (payload?.description || '').trim() || '';
  const priority = toLinearPriority(payload?.priority);
  const labelIds = await resolveLinearLabelIds(apiKey, teamId, payload?.labels);

  const res = await fetch(LINEAR_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: CREATE_ISSUE_MUTATION,
      variables: {
        input: {
          teamId,
          title,
          ...(description && { description }),
          ...(Number.isFinite(priority) && { priority }),
          ...(labelIds.length > 0 && { labelIds }),
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const hint = getHttpHint('linear', res.status);
    const err = new Error(`Linear API error ${res.status}: ${text || res.statusText}${hint ? ' ' + hint : ''}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const issue = data?.data?.issueCreate?.issue;
  if (!issue) {
    const err = data?.errors?.[0]?.message || JSON.stringify(data);
    throw new Error(`Linear API: ${err}`);
  }

  const key = issue.identifier || issue.id;
  const url = issue.url || (key ? `https://linear.app/issue/${key}` : '');

  return { key, url };
}

const GET_ISSUE_QUERY = `
  query GetIssue($identifier: String!) {
    issue(identifier: $identifier) { id url }
  }
`;

const CREATE_COMMENT_MUTATION = `
  mutation CreateComment($input: CommentCreateInput!) {
    commentCreate(input: $input) {
      comment { id }
    }
  }
`;

/**
 * Add a comment to an existing Linear issue (by identifier, e.g. ENG-123).
 * @param {string} identifier - Issue identifier (e.g. ENG-123)
 * @param {string} bodyText - Plain text comment
 * @param {object} config - Unused; env has LINEAR_API_KEY
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function addComment(identifier, bodyText, config) {
  const apiKey = process.env.LINEAR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('LINEAR_API_KEY is not set. Add it to .env. Get a key at https://linear.app/settings/api');
  }

  const id = (identifier || '').trim();
  if (!id) throw new Error('Linear issue identifier missing.');

  const resIssue = await fetch(LINEAR_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: apiKey },
    body: JSON.stringify({ query: GET_ISSUE_QUERY, variables: { identifier: id } }),
  });
  if (!resIssue.ok) {
    const text = await resIssue.text();
    const hint = getHttpHint('linear', resIssue.status);
    const e = new Error(`Linear API ${resIssue.status}: ${text}${hint ? ' ' + hint : ''}`);
    e.status = resIssue.status;
    throw e;
  }
  const dataIssue = await resIssue.json();
  const issue = dataIssue?.data?.issue;
  if (!issue?.id) {
    const err = dataIssue?.errors?.[0]?.message || 'Issue not found';
    throw new Error(`Linear: ${err}`);
  }

  const resComment = await fetch(LINEAR_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: apiKey },
    body: JSON.stringify({
      query: CREATE_COMMENT_MUTATION,
      variables: { input: { issueId: issue.id, body: (bodyText || '').trim() || '(no message)' } },
    }),
  });
  if (!resComment.ok) {
    const text = await resComment.text();
    const hint = getHttpHint('linear', resComment.status);
    const e = new Error(`Linear comment API ${resComment.status}: ${text}${hint ? ' ' + hint : ''}`);
    e.status = resComment.status;
    throw e;
  }
  const dataComment = await resComment.json();
  if (dataComment?.errors?.[0]) throw new Error(`Linear comment: ${dataComment.errors[0].message}`);

  const url = issue.url || `https://linear.app/issue/${id}`;
  return { key: id, url };
}
