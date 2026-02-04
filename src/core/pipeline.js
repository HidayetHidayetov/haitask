/**
 * Pipeline: Git → AI → Jira
 * Orchestrates steps. No direct I/O (no console.log).
 * Returns structured result for CLI to display.
 */

// Stub — will be implemented when git/ai/jira are ready
export async function runPipeline(config, options = {}) {
  const { dry = false } = options;
  return { ok: false, message: 'Pipeline not implemented' };
}
