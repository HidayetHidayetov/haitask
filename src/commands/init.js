/**
 * haitask init — Interactive setup: prompts → .haitaskrc, optional .env placement.
 */

import { createInterface } from 'node:readline';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateEnv } from '../config/init.js';
import { loadConfig } from '../config/load.js';

const DEFAULT_MODELS = { groq: 'llama-3.1-8b-instant', deepseek: 'deepseek-chat', openai: 'gpt-4o-mini' };

function question(rl, prompt, defaultVal = '') {
  const suffix = defaultVal ? ` (${defaultVal})` : '';
  return new Promise((res) => rl.question(prompt + suffix + ': ', (ans) => res((ans || defaultVal).trim())));
}

function parseList(str) {
  return str.split(',').map((s) => s.trim()).filter(Boolean);
}

function getEnvExampleContent(target) {
  const base = `# HAITASK — fill in your own API keys (never commit real keys)
# AI: set the key for the provider in .haitaskrc (ai.provider)
GROQ_API_KEY=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
`;
  const jiraBlock = `
# Jira (when target is jira)
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_ACCOUNT_ID=
`;
  const trelloBlock = `
# Trello (when target is trello). Get key+token: https://trello.com/app-key
TRELLO_API_KEY=
TRELLO_TOKEN=
TRELLO_MEMBER_ID=
`;
  const linearBlock = `
# Linear (when target is linear). Get key: https://linear.app/settings/api
LINEAR_API_KEY=
`;
  if (target === 'trello') return base + trelloBlock;
  if (target === 'linear') return base + linearBlock;
  return base + jiraBlock;
}

async function askJiraConfig(rl, ai, rules) {
  const baseUrl = await question(rl, 'Jira base URL', 'https://your-domain.atlassian.net');
  const projectKey = await question(rl, 'Jira project key', 'PROJ');
  const issueType = await question(rl, 'Jira issue type', 'Task');
  const transitionToStatus = await question(rl, 'Transition issue to status after create (e.g. Done, To Do, In Progress)', 'Done');
  return {
    target: 'jira',
    jira: {
      baseUrl,
      projectKey,
      issueType,
      transitionToStatus: (transitionToStatus || 'Done').trim() || 'Done',
    },
    ai,
    rules,
  };
}

async function askTrelloConfig(rl, ai, rules) {
  const listId = await question(rl, 'Trello list ID (list where new cards go; from board URL or API)', '');
  const labelIdsStr = await question(rl, 'Trello label IDs to add to every card (comma-separated, optional)', '');
  const memberId = (await question(rl, 'Trello member ID for assignee (optional)', '')).trim();
  const labelIds = parseList(labelIdsStr);
  const trello = {
    listId: listId.trim(),
    ...(labelIds.length > 0 && { labelIds }),
    ...(memberId && { memberId }),
  };
  return { target: 'trello', trello, ai, rules };
}

/** Quick mode: only list ID (required). Hint in prompt. */
async function askTrelloConfigQuick(rl, ai, rules) {
  const listId = await question(
    rl,
    'Trello list ID (Board → list ⋯ → Copy link → 24-char ID from URL, or run: node scripts/get-trello-list.js)',
    ''
  );
  const trello = { listId: listId.trim() };
  return { target: 'trello', trello, ai, rules };
}

async function askLinearConfig(rl, ai, rules) {
  const teamId = await question(rl, 'Linear team ID (Team → Settings → ID, or from URL)', '');
  const linear = { teamId: teamId.trim() };
  return { target: 'linear', linear, ai, rules };
}

function writeEnvFile(cwd, target, where) {
  const envContent = getEnvExampleContent(target);
  const home = process.env.HOME || process.env.USERPROFILE;

  if (where.trim() === '2' && home) {
    const globalDir = resolve(home, '.haitask');
    const globalEnv = resolve(globalDir, '.env');
    if (!existsSync(globalDir)) mkdirSync(globalDir, { recursive: true });
    if (existsSync(globalEnv)) {
      console.log('~/.haitask/.env already exists.');
    } else {
      writeFileSync(globalEnv, envContent, 'utf-8');
      console.log('Created ~/.haitask/.env — add your API keys there (used by all projects).');
    }
  } else {
    const projectEnv = resolve(cwd, '.env');
    if (existsSync(projectEnv)) {
      console.log('.env already exists in this project.');
    } else {
      writeFileSync(projectEnv, envContent, 'utf-8');
      console.log('Created .env in this project — add your API keys there.');
    }
  }
}

function printEnvHints(config, missing) {
  console.warn('\nAdd these to your .env before "haitask run":', missing.join(', '));
  console.log('Env is read from: project .env, then ~/.haitask/.env');
  if (config?.ai?.provider === 'groq') console.log('Groq key: https://console.groq.com/keys');
  if (config?.ai?.provider === 'deepseek') console.log('Deepseek key: https://platform.deepseek.com/');
  if (config?.target === 'trello') console.log('Trello key + token: https://trello.com/app-key');
  if (config?.target === 'linear') console.log('Linear key: https://linear.app/settings/api');
}

const DEFAULT_RULES = {
  allowedBranches: ['main', 'develop', 'master'],
  commitPrefixes: ['feat', 'fix', 'chore'],
};
const DEFAULT_AI = { provider: 'groq', model: DEFAULT_MODELS.groq };

export async function runInit(options = {}) {
  const quick = options.quick === true;
  const cwd = process.cwd();
  const rcPath = resolve(cwd, '.haitaskrc');

  if (existsSync(rcPath)) {
    console.warn('haitask init: .haitaskrc already exists. Not overwriting.');
    process.exitCode = 1;
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log(quick ? 'haitask init --quick (minimal questions, defaults for the rest).\n' : 'haitask init — answer the questions (Enter = use default).\n');

    const targetAnswer = await question(rl, 'Target: 1 = Jira, 2 = Trello, 3 = Linear', '1');
    const targetMap = { '1': 'jira', '2': 'trello', '3': 'linear' };
    const target = targetMap[targetAnswer] || 'jira';

    let rules;
    let ai;
    if (quick) {
      rules = DEFAULT_RULES;
      ai = DEFAULT_AI;
    } else {
      const aiProvider = await question(rl, 'AI provider (groq | deepseek | openai)', 'groq');
      const allowedBranchesStr = await question(rl, 'Allowed branches (comma-separated)', 'main,develop,master');
      const commitPrefixesStr = await question(rl, 'Commit prefixes (comma-separated)', 'feat,fix,chore');
      rules = {
        allowedBranches: parseList(allowedBranchesStr),
        commitPrefixes: parseList(commitPrefixesStr),
      };
      ai = {
        provider: aiProvider.toLowerCase(),
        model: DEFAULT_MODELS[aiProvider.toLowerCase()] || DEFAULT_MODELS.groq,
      };
    }

    let config;
    if (target === 'jira') config = await askJiraConfig(rl, ai, rules);
    else if (target === 'trello') config = quick ? await askTrelloConfigQuick(rl, ai, rules) : await askTrelloConfig(rl, ai, rules);
    else config = await askLinearConfig(rl, ai, rules);

    writeFileSync(rcPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('\nCreated .haitaskrc');

    const where = await question(rl, 'Where to store API keys? (1 = this project .env, 2 = global ~/.haitask/.env)', '1');
    writeEnvFile(cwd, target, where);
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
    printEnvHints(loadedConfig, missing);
    process.exitCode = 1;
    return;
  }

  console.log('\nEnvironment looks good. Run "haitask run" after your next commit.');
}
