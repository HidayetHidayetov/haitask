/**
 * haitask run [--dry] — Execute full pipeline
 * Thin handler: load config, call pipeline, output result.
 */

import { loadConfig } from '../config/load.js';
import { runPipeline } from '../core/pipeline.js';

export async function runRun(options = {}) {
  const dry = options.dry ?? false;
  const type = options.type?.trim() || undefined;
  const status = options.status?.trim() || undefined;

  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error('Config error:', err.message);
    process.exitCode = 1;
    return;
  }

  try {
    const result = await runPipeline(config, { dry, issueType: type, transitionToStatus: status });

    if (!result.ok) {
      console.error(result.error || 'Pipeline failed.');
      process.exitCode = 1;
      return;
    }

    if (result.dry) {
      console.log('Dry run — no Jira issue created.');
      console.log('Commit:', result.commitData?.message?.split('\n')[0] || '');
      console.log('Would create Jira task:', result.payload?.title || '');
      if (result.payload?.description) {
        console.log('Description (preview):', result.payload.description.slice(0, 120) + (result.payload.description.length > 120 ? '...' : ''));
      }
      return;
    }

    // Keep output URL consistent with Jira client behavior (prefer .haitaskrc baseUrl).
    const baseUrl = (config?.jira?.baseUrl || process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
    const issueUrl = baseUrl ? `${baseUrl}/browse/${result.key}` : result.key;
    console.log('Created Jira issue:', result.key);
    if (issueUrl !== result.key) {
      console.log(issueUrl);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  }
}
