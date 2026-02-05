/**
 * Shared config constants. Single source for target names and ID formats.
 */

export const VALID_TARGETS = ['jira', 'trello', 'linear'];

/** Trello object IDs (list, member, label, board) are 24-char hex. */
export const TRELLO_ID_REGEX = /^[a-fA-F0-9]{24}$/;
