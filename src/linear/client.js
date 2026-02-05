/**
 * Linear GraphQL client: create issue (task).
 * API: https://api.linear.app/graphql
 */

const LINEAR_GRAPHQL = 'https://api.linear.app/graphql';

const CREATE_ISSUE_MUTATION = `
  mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      issue { identifier url }
    }
  }
`;

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
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Linear API error ${res.status}: ${text || res.statusText}`);
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
  if (!resIssue.ok) throw new Error(`Linear API ${resIssue.status}: ${await resIssue.text()}`);
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
  if (!resComment.ok) throw new Error(`Linear comment API ${resComment.status}: ${await resComment.text()}`);
  const dataComment = await resComment.json();
  if (dataComment?.errors?.[0]) throw new Error(`Linear comment: ${dataComment.errors[0].message}`);

  const url = issue.url || `https://linear.app/issue/${id}`;
  return { key: id, url };
}
