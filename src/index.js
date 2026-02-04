#!/usr/bin/env node

import { loadEnvFiles } from './config/env-loader.js';
loadEnvFiles();
import { program } from 'commander';
import { runInit } from './commands/init.js';
import { runRun } from './commands/run.js';

program
  .name('haitask')
  .description('HAITASK — Generate Jira tasks from Git commits using AI')
  .version('0.1.3');

program
  .command('init')
  .description('Create .haitaskrc and validate environment')
  .action(runInit);

program
  .command('run')
  .description('Run full pipeline: Git → AI → Jira')
  .option('--dry', 'Skip Jira API call, run everything else')
  .option('-t, --type <type>', 'Jira issue type for this run (e.g. Task, Bug, Story, Sub-task). Overrides .haitaskrc jira.issueType')
  .option('-s, --status <status>', 'Transition issue to this status after create (e.g. Done, "To Do", "In Progress"). Overrides .haitaskrc jira.transitionToStatus')
  .action((opts) => runRun(opts));

program.parse();
