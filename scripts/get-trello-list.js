/**
 * One-off: load .env, fetch first board + first list, print list ID for .haitaskrc
 */
import { loadEnvFiles } from '../src/config/env-loader.js';

loadEnvFiles();

const key = process.env.TRELLO_API_KEY?.trim();
const token = process.env.TRELLO_TOKEN?.trim();
if (!key || !token) {
  console.error('Missing TRELLO_API_KEY or TRELLO_TOKEN in .env');
  process.exit(1);
}

const boardsUrl = `https://api.trello.com/1/members/me/boards?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}&fields=id,name`;
const res1 = await fetch(boardsUrl);
if (!res1.ok) {
  console.error('Trello boards API', res1.status, await res1.text());
  process.exit(1);
}
const boards = await res1.json();
if (!Array.isArray(boards) || boards.length === 0) {
  console.error('No boards found');
  process.exit(1);
}
const board = boards[0];
const listsUrl = `https://api.trello.com/1/boards/${board.id}/lists?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}&fields=id,name`;
const res2 = await fetch(listsUrl);
if (!res2.ok) {
  console.error('Trello lists API', res2.status, await res2.text());
  process.exit(1);
}
const lists = await res2.json();
if (!Array.isArray(lists) || lists.length === 0) {
  console.error('No lists on board');
  process.exit(1);
}
const list = lists[0];
console.log("Trello list ID: ", list.id);
