/**
 * Retry a promise-returning function on retryable failures (5xx, 429, network).
 * Non-retryable: 4xx (except 429). Errors with .status are treated as HTTP status.
 */

const DEFAULT_RETRIES = 2;
const DEFAULT_DELAY_MS = 1000;
const DEFAULT_BACKOFF = 2;

function isRetryable(err) {
  if (!err) return false;
  const status = err.status;
  if (status != null) {
    if (status === 429) return true; // rate limit
    if (status >= 500 && status < 600) return true; // server error
    return false; // 4xx (except 429) — don't retry
  }
  // Network / timeout / DNS
  if (err instanceof TypeError && err.message?.includes?.('fetch')) return true;
  if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') return true;
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call fn(); on reject, retry up to retries times if error is retryable (5xx, 429, network).
 * @param {() => Promise<T>} fn
 * @param {{ retries?: number, delayMs?: number, backoff?: number }} options
 * @returns {Promise<T>}
 */
export async function withRetry(fn, options = {}) {
  const retries = options.retries ?? DEFAULT_RETRIES;
  let delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const backoff = options.backoff ?? DEFAULT_BACKOFF;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries || !isRetryable(err)) throw err;
      await sleep(delayMs);
      delayMs *= backoff;
    }
  }
  throw lastError;
}
