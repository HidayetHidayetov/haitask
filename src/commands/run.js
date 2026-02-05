/**
 * haitask run — Execute full pipeline (Git → AI → target).
 * Thin handler: load config, call pipeline, output result.
 */

import { loadConfig } from '../config/load.js';
import { runPipeline } from '../core/pipeline.js';
import { buildJiraUrl } from '../utils/urls.js';

function getDisplayUrl(config, key, resultUrl) {
  if (resultUrl) return resultUrl;
  const target = (config?.target || 'jira').toLowerCase();
  return target === 'jira' ? buildJiraUrl(config, key) : key;
}

export async function runRun(options = {}) {
  const dry = options.dry ?? false;
  const type = options.type?.trim() || undefined;
  const status = options.status?.trim() || undefined;
  const commits = options.commits != null ? Number(options.commits) : 1;

  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error('Config error:', err.message);
    process.exitCode = 1;
    return;
  }

  try {
    const result = await runPipeline(config, { dry, issueType: type, transitionToStatus: status, commits });

    if (!result.ok) {
      console.error(result.error || 'Pipeline failed.');
      process.exitCode = 1;
      return;
    }

    if (result.dry) {
      console.log('Dry run — no task created.');
      if (result.commented) {
        console.log('Would add comment to existing:', result.key);
      } else {
        const msg = result.commitData?.message || '';
        const preview = msg.includes('\n\n---\n\n') ? `${result.commitData?.count ?? '?'} commits` : msg.split('\n')[0] || '';
        console.log('Commit(s):', preview);
        console.log('Would create task:', result.payload?.title || '');
        if (result.payload?.description) {
          const desc = result.payload.description;
          console.log('Description (preview):', desc.slice(0, 120) + (desc.length > 120 ? '...' : ''));
        }
      }
      return;
    }

    const displayUrl = getDisplayUrl(config, result.key, result.url);
    if (result.commented) {
      console.log('Added comment to:', result.key);
    } else {
      console.log('Created task:', result.key);
    }
    if (displayUrl && displayUrl !== result.key) console.log(displayUrl);
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  }
}
