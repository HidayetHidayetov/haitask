/**
 * AI provider abstraction: commit + context → strict JSON task payload.
 * Supports: OpenAI, Deepseek, Groq (free). Switch via .haitaskrc ai.provider.
 */

import { generateOpenAI } from './openai.js';
import { generateDeepseek } from './deepseek.js';
import { generateGroq } from './groq.js';

// Re-export utils for convenience
export { buildPrompt, parseTaskPayload } from './utils.js';

const PROVIDERS = ['openai', 'deepseek', 'groq'];

/**
 * Main entry: generate task payload based on provider in config.
 * @param {{ message: string, branch: string, repoName: string }} commitData
 * @param {{ ai: { provider?: string, model?: string } }} config
 * @returns {Promise<{ title: string, description: string, labels: string[] }>}
 */
export async function generateTaskPayload(commitData, config) {
  const provider = (config?.ai?.provider || 'groq').toLowerCase();

  switch (provider) {
    case 'openai':
      return generateOpenAI(commitData, config);
    case 'deepseek':
      return generateDeepseek(commitData, config);
    case 'groq':
      return generateGroq(commitData, config);
    default:
      throw new Error(`Unknown AI provider: ${provider}. Supported: ${PROVIDERS.join(', ')}`);
  }
}
