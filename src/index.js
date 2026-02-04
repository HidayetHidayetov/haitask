#!/usr/bin/env node

import 'dotenv/config';
import { program } from 'commander';
import { runInit } from './commands/init.js';
import { runRun } from './commands/run.js';

program
  .name('haitask')
  .description('HAITASK — Generate Jira tasks from Git commits using AI')
  .version('0.1.0');

program
  .command('init')
  .description('Create .haitaskrc and validate environment')
  .action(runInit);

program
  .command('run')
  .description('Run full pipeline: Git → AI → Jira')
  .option('--dry', 'Skip Jira API call, run everything else')
  .action((opts) => runRun(opts));

program.parse();
