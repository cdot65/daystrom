#!/usr/bin/env node

import { Command } from 'commander';
import { registerGenerateCommand } from './commands/generate.js';
import { registerResumeCommand } from './commands/resume.js';
import { registerReportCommand } from './commands/report.js';
import { registerListCommand } from './commands/list.js';

const program = new Command();

program
  .name('guardrail-gen')
  .description('Prisma AIRS custom topic guardrail generator')
  .version('0.1.0');

registerGenerateCommand(program);
registerResumeCommand(program);
registerReportCommand(program);
registerListCommand(program);

program.parse();
