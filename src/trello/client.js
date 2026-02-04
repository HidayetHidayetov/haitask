/**
 * Trello REST client: create card (task) in a list.
 * API: https://api.trello.com/1/cards (key + token in query).
 */

const TRELLO_API = 'https://api.trello.com/1';

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
  if (!listId) {
    throw new Error('Trello list ID missing. Set trello.listId in .haitaskrc (the list where cards are created).');
  }

  const name = (payload?.title || '').trim() || 'Untitled';
  const desc = (payload?.description || '').trim() || '';

  const query = new URLSearchParams({ key: apiKey, token });
  const body = { idList: listId, name, desc };

  const memberId = trello.memberId?.trim() || process.env.TRELLO_MEMBER_ID?.trim();
  if (memberId) body.idMembers = [memberId];

  const labelIds = trello.labelIds;
  if (Array.isArray(labelIds) && labelIds.length > 0) {
    body.idLabels = labelIds.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim());
  }

  const url = `${TRELLO_API}/cards?${query.toString()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello API error ${res.status}: ${text || res.statusText}`);
  }

  const card = await res.json();
  const key = card.shortLink || card.id;
  const cardUrl = card.shortUrl || card.url || (key ? `https://trello.com/c/${key}` : '');

  return { key, url: cardUrl };
}
