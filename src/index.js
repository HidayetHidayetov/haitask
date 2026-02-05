#!/usr/bin/env node

import { createRequire } from 'node:module';
import { loadEnvFiles } from './config/env-loader.js';
import { program } from 'commander';
import { runInit } from './commands/init.js';
import { runRun } from './commands/run.js';

loadEnvFiles();

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

program
  .name('haitask')
  .description('HAITASK — Generate Jira tasks from Git commits using AI')
  .version(pkg.version);

program
  .command('init')
  .description('Create .haitaskrc and validate environment')
  .action(runInit);

program
  .command('run')
  .description('Run full pipeline: Git → AI → target (Jira or Trello)')
  .option('--dry', 'Skip creating task, run everything else')
  .option('-c, --commits <n>', 'Number of commits to combine into one task (default: 1)', '1')
  .option('-t, --type <type>', 'Jira issue type for this run (e.g. Task, Bug, Story). Overrides .haitaskrc jira.issueType')
  .option('-s, --status <status>', 'Jira transition-to status after create (e.g. Done, "To Do"). Overrides .haitaskrc jira.transitionToStatus')
  .action((opts) => runRun(opts));

program.parse();
