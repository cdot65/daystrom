#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { registerAuditCommand } from './commands/audit.js';
import { registerGenerateCommand } from './commands/generate.js';
import { registerListCommand } from './commands/list.js';
import { registerRedteamCommand } from './commands/redteam.js';
import { registerReportCommand } from './commands/report.js';
import { registerResumeCommand } from './commands/resume.js';

const program = new Command();

program
  .name('daystrom')
  .description('Automated Prisma AIRS custom topic guardrail generator')
  .version('0.1.0');

registerGenerateCommand(program);
registerResumeCommand(program);
registerReportCommand(program);
registerListCommand(program);
registerRedteamCommand(program);
registerAuditCommand(program);

program.parse();
