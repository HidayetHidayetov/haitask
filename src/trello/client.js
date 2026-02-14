/**
 * Trello REST client: create card (task) in a list.
 * API: https://api.trello.com/1/cards (key + token in query).
 */

import { TRELLO_ID_REGEX } from '../config/constants.js';
import { getHttpHint } from '../utils/http-hints.js';

const TRELLO_API = 'https://api.trello.com/1';

function withPriorityInDescription(description, priority) {
  const p = (priority || '').trim();
  if (!p) return description;
  return `Priority: ${p}\n\n${description}`.trim();
}

async function resolveTrelloLabelIds(apiKey, token, listId, labels) {
  const desired = (Array.isArray(labels) ? labels : [])
    .filter((v) => typeof v === 'string' && v.trim())
    .map((v) => v.trim().toLowerCase());
  if (desired.length === 0) return [];

  try {
    const query = new URLSearchParams({ key: apiKey, token });
    const listRes = await fetch(`${TRELLO_API}/lists/${encodeURIComponent(listId)}?fields=idBoard&${query.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!listRes.ok) return [];
    const listData = await listRes.json();
    const boardId = listData?.idBoard;
    if (!boardId || !TRELLO_ID_REGEX.test(boardId)) return [];

    const labelsRes = await fetch(
      `${TRELLO_API}/boards/${encodeURIComponent(boardId)}/labels?fields=id,name&limit=1000&${query.toString()}`,
      { method: 'GET', headers: { Accept: 'application/json' } }
    );
    if (!labelsRes.ok) return [];
    const boardLabels = await labelsRes.json();
    if (!Array.isArray(boardLabels)) return [];

    const byName = new Map();
    for (const label of boardLabels) {
      const name = typeof label?.name === 'string' ? label.name.trim().toLowerCase() : '';
      if (name && typeof label?.id === 'string' && TRELLO_ID_REGEX.test(label.id)) {
        byName.set(name, label.id);
      }
    }
    return desired.map((name) => byName.get(name)).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Create a Trello card from AI payload. Same interface as Jira adapter: returns { key, url }.
 * @param {object} payload - { title, description, labels, priority } from AI
 * @param {object} config - .haitaskrc (trello.listId, optional trello.labelIds, trello.memberId)
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function createTask(payload, config) {
  const apiKey = process.env.TRELLO_API_KEY?.trim();
  const token = process.env.TRELLO_TOKEN?.trim();
  if (!apiKey || !token) {
    throw new Error(
      'Trello credentials missing. Set TRELLO_API_KEY and TRELLO_TOKEN in .env. Get them at https://trello.com/app-key'
    );
  }

  const trello = config?.trello || {};
  const listId = trello.listId?.trim();
  const listIdHint = ' Get it from list URL (list ⋯ → Copy link) or run: node scripts/get-trello-list.js';
  if (!listId) {
    throw new Error('Trello list ID missing. Set trello.listId in .haitaskrc (the list where cards are created).' + listIdHint);
  }
  if (!TRELLO_ID_REGEX.test(listId)) {
    throw new Error(
      'Trello list ID must be a 24-character hex string.' + listIdHint
    );
  }

  const name = (payload?.title || '').trim() || 'Untitled';
  const desc = withPriorityInDescription((payload?.description || '').trim() || '', payload?.priority);

  const query = new URLSearchParams({ key: apiKey, token });
  const body = { idList: listId, name, desc };

  // API expects 24-char hex member ID, not username. Skip if value looks like username.
  const memberId = trello.memberId?.trim() || process.env.TRELLO_MEMBER_ID?.trim();
  if (memberId && TRELLO_ID_REGEX.test(memberId)) body.idMembers = [memberId];

  const configLabelIds = Array.isArray(trello.labelIds)
    ? trello.labelIds
      .filter((id) => typeof id === 'string' && id.trim())
      .map((id) => id.trim())
      .filter((id) => TRELLO_ID_REGEX.test(id))
    : [];
  const aiLabelIds = await resolveTrelloLabelIds(apiKey, token, listId, payload?.labels);
  const mergedLabelIds = [...new Set([...configLabelIds, ...aiLabelIds])];
  if (mergedLabelIds.length > 0) {
    body.idLabels = mergedLabelIds;
  }

  const url = `${TRELLO_API}/cards?${query.toString()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    const hint = getHttpHint('trello', res.status);
    const err = new Error(`Trello API error ${res.status}: ${text || res.statusText}${hint ? ' ' + hint : ''}`);
    err.status = res.status;
    throw err;
  }

  const card = await res.json();
  const key = card.shortLink || card.id;
  const cardUrl = card.shortUrl || card.url || (key ? `https://trello.com/c/${key}` : '');

  return { key, url: cardUrl };
}

/**
 * Add a comment to an existing Trello card (by shortLink or id).
 * @param {string} cardIdOrShortLink - Card id or shortLink (e.g. from URL)
 * @param {string} bodyText - Plain text comment
 * @param {object} config - Unused; env has TRELLO_API_KEY, TRELLO_TOKEN
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function addComment(cardIdOrShortLink, bodyText, config) {
  const apiKey = process.env.TRELLO_API_KEY?.trim();
  const token = process.env.TRELLO_TOKEN?.trim();
  if (!apiKey || !token) {
    throw new Error(
      'Trello credentials missing. Set TRELLO_API_KEY and TRELLO_TOKEN in .env. Get them at https://trello.com/app-key'
    );
  }
  const id = (cardIdOrShortLink || '').trim();
  if (!id) throw new Error('Trello card id/shortLink missing.');
  const query = new URLSearchParams({ key: apiKey, token, text: (bodyText || '').trim() || '(no message)' });
  const res = await fetch(`${TRELLO_API}/cards/${encodeURIComponent(id)}/actions/comments?${query.toString()}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    const hint = getHttpHint('trello', res.status);
    const err = new Error(`Trello comment API ${res.status}: ${text || res.statusText}${hint ? ' ' + hint : ''}`);
    err.status = res.status;
    throw err;
  }
  return { key: id, url: `https://trello.com/c/${id}` };
}
