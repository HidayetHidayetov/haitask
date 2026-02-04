/**
 * haitask init — Interactive setup: prompts → .haitaskrc, optional .env placement.
 */

import { createInterface } from 'readline';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { createDefaultConfigFile, validateEnv } from '../config/init.js';
import { loadConfig } from '../config/load.js';

const DEFAULT_MODELS = { groq: 'llama-3.1-8b-instant', deepseek: 'deepseek-chat', openai: 'gpt-4o-mini' };

function question(rl, prompt, defaultVal = '') {
  const def = defaultVal ? ` (${defaultVal})` : '';
  return new Promise((resolve) => rl.question(prompt + def + ': ', (ans) => resolve((ans || defaultVal).trim())));
}

function getEnvExampleContent() {
  return `# HAITASK — fill in your own API keys (never commit real keys)
# AI: set the key for the provider in .haitaskrc (ai.provider)
GROQ_API_KEY=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=

# Jira (required)
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_ACCOUNT_ID=
`;
}

export async function runInit() {
  const cwd = process.cwd();
  const rcPath = resolve(cwd, '.haitaskrc');

  if (existsSync(rcPath)) {
    console.warn('haitask init: .haitaskrc already exists. Not overwriting.');
    process.exitCode = 1;
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log('haitask init — answer the questions (Enter = use default).\n');

    const jiraBaseUrl = await question(rl, 'Jira base URL', 'https://your-domain.atlassian.net');
    const jiraProjectKey = await question(rl, 'Jira project key', 'PROJ');
    const jiraIssueType = await question(rl, 'Jira issue type', 'Task');
    const jiraTransitionToStatus = await question(rl, 'Transition issue to status after create (e.g. Done, To Do, In Progress)', 'Done');
    const aiProvider = await question(rl, 'AI provider (groq | deepseek | openai)', 'groq');
    const allowedBranchesStr = await question(rl, 'Allowed branches (comma-separated)', 'main,develop,master');
    const commitPrefixesStr = await question(rl, 'Commit prefixes (comma-separated)', 'feat,fix,chore');

    const allowedBranches = allowedBranchesStr.split(',').map((s) => s.trim()).filter(Boolean);
    const commitPrefixes = commitPrefixesStr.split(',').map((s) => s.trim()).filter(Boolean);
    const model = DEFAULT_MODELS[aiProvider.toLowerCase()] || DEFAULT_MODELS.groq;

    const config = {
      target: 'jira',
      jira: {
        baseUrl: jiraBaseUrl,
        projectKey: jiraProjectKey,
        issueType: jiraIssueType,
        transitionToStatus: (jiraTransitionToStatus || 'Done').trim() || 'Done',
      },
      ai: { provider: aiProvider.toLowerCase(), model },
      rules: { allowedBranches, commitPrefixes },
    };

    writeFileSync(rcPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('\nCreated .haitaskrc');

    const where = await question(rl, 'Where to store API keys? (1 = this project .env, 2 = global ~/.haitask/.env)', '1');
    const home = process.env.HOME || process.env.USERPROFILE;

    if (where.trim() === '2' && home) {
      const globalDir = resolve(home, '.haitask');
      const globalEnv = resolve(globalDir, '.env');
      if (!existsSync(globalDir)) mkdirSync(globalDir, { recursive: true });
      if (!existsSync(globalEnv)) {
        writeFileSync(globalEnv, getEnvExampleContent(), 'utf-8');
        console.log('Created ~/.haitask/.env — add your API keys there (used by all projects).');
      } else {
        console.log('~/.haitask/.env already exists.');
      }
    } else {
      const projectEnv = resolve(cwd, '.env');
      if (!existsSync(projectEnv)) {
        writeFileSync(projectEnv, getEnvExampleContent(), 'utf-8');
        console.log('Created .env in this project — add your API keys there.');
      } else {
        console.log('.env already exists in this project.');
      }
    }
  } finally {
    rl.close();
  }

  let loadedConfig = null;
  try {
    loadedConfig = loadConfig();
  } catch {
    // rc just written; load may fail if cwd changed
  }

  const { valid, missing } = validateEnv(cwd, loadedConfig);
  if (!valid) {
    console.warn('\nAdd these to your .env before "haitask run":', missing.join(', '));
    console.log('Env is read from: project .env, then ~/.haitask/.env');
    if (loadedConfig?.ai?.provider === 'groq') console.log('Groq key: https://console.groq.com/keys');
    if (loadedConfig?.ai?.provider === 'deepseek') console.log('Deepseek key: https://platform.deepseek.com/');
    process.exitCode = 1;
    return;
  }

  console.log('\nEnvironment looks good. Run "haitask run" after your next commit.');
}
