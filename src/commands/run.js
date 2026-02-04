/**
 * haitask run — Execute full pipeline (Git → AI → Jira).
 * Thin handler: load config, call pipeline, output result.
 */

import { loadConfig } from '../config/load.js';
import { runPipeline } from '../core/pipeline.js';

function buildIssueUrl(config, issueKey) {
  const baseUrl = (config?.jira?.baseUrl || process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
  return baseUrl ? `${baseUrl}/browse/${issueKey}` : issueKey;
}

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
        const desc = result.payload.description;
        console.log('Description (preview):', desc.slice(0, 120) + (desc.length > 120 ? '...' : ''));
      }
      return;
    }

    console.log('Created Jira issue:', result.key);
    const issueUrl = buildIssueUrl(config, result.key);
    if (issueUrl !== result.key) console.log(issueUrl);
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  }
}
