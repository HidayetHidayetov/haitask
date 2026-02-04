/**
 * haitask run — Execute full pipeline (Git → AI → target).
 * Thin handler: load config, call pipeline, output result.
 */

import { loadConfig } from '../config/load.js';
import { runPipeline } from '../core/pipeline.js';

function buildTaskUrl(config, key) {
  const target = (config?.target || 'jira').toLowerCase();
  if (target === 'jira') {
    const baseUrl = (config?.jira?.baseUrl || process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
    return baseUrl ? `${baseUrl}/browse/${key}` : key;
  }
  return key;
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
      console.log('Dry run — no task created.');
      console.log('Commit:', result.commitData?.message?.split('\n')[0] || '');
      console.log('Would create task:', result.payload?.title || '');
      if (result.payload?.description) {
        const desc = result.payload.description;
        console.log('Description (preview):', desc.slice(0, 120) + (desc.length > 120 ? '...' : ''));
      }
      return;
    }

    const displayUrl = result.url || buildTaskUrl(config, result.key);
    console.log('Created task:', result.key);
    if (displayUrl && displayUrl !== result.key) console.log(displayUrl);
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  }
}
