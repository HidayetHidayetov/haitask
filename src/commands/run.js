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

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function printFailure(json, message, prefix = null) {
  if (json) {
    printJson({ ok: false, error: prefix ? `${prefix}: ${message}` : message });
  } else if (prefix) {
    console.error(`${prefix}:`, message);
  } else {
    console.error(message);
  }
  process.exitCode = 1;
}

function toJsonResult(result, config) {
  const displayUrl = getDisplayUrl(config, result.key, result.url);
  return {
    ok: true,
    dry: !!result.dry,
    skipped: !!result.skipped,
    commented: !!result.commented,
    key: result.key || null,
    url: displayUrl || null,
    payload: result.payload || null,
    commit: result.commitData
      ? {
          branch: result.commitData.branch,
          commitHash: result.commitData.commitHash,
          repoName: result.commitData.repoName,
          count: result.commitData.count || 1,
        }
      : null,
  };
}

function printDryResult(result) {
  console.log('Dry run — no task created.');
  if (result.commented) {
    console.log('Would add comment to existing:', result.key);
    return;
  }
  const msg = result.commitData?.message || '';
  const preview = msg.includes('\n\n---\n\n') ? `${result.commitData?.count ?? '?'} commits` : msg.split('\n')[0] || '';
  console.log('Commit(s):', preview);
  console.log('Would create task:', result.payload?.title || '');
  if (result.payload?.description) {
    const desc = result.payload.description;
    console.log('Description (preview):', desc.slice(0, 120) + (desc.length > 120 ? '...' : ''));
  }
}

function printSuccessResult(result, config) {
  if (result.dry) {
    printDryResult(result);
    return;
  }

  const displayUrl = getDisplayUrl(config, result.key, result.url);
  if (result.skipped) {
    console.log('Already created for this commit:', result.key);
  } else if (result.commented) {
    console.log('Added comment to:', result.key);
  } else {
    console.log('Created task:', result.key);
  }
  if (displayUrl && displayUrl !== result.key) console.log(displayUrl);
}

export async function runRun(options = {}) {
  const dry = options.dry ?? false;
  const json = options.json ?? false;
  const type = options.type?.trim() || undefined;
  const status = options.status?.trim() || undefined;
  const commits = Number(options.commits ?? 1);

  let config;
  try {
    config = loadConfig();
  } catch (err) {
    printFailure(json, err.message, 'Config error');
    return;
  }

  try {
    const result = await runPipeline(config, { dry, issueType: type, transitionToStatus: status, commits });

    if (!result.ok) {
      printFailure(json, result.error || 'Pipeline failed.');
      return;
    }

    if (json) {
      printJson(toJsonResult(result, config));
      return;
    }
    printSuccessResult(result, config);
  } catch (err) {
    printFailure(json, err.message, 'Error');
  }
}
