#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { registerAuditCommand } from './commands/audit.js';
import { registerGenerateCommand } from './commands/generate.js';
import { registerListCommand } from './commands/list.js';
import { registerModelSecurityCommand } from './commands/modelsecurity.js';
import { registerRedteamCommand } from './commands/redteam.js';
import { registerReportCommand } from './commands/report.js';
import { registerResumeCommand } from './commands/resume.js';

const program = new Command();

program
  .name('daystrom')
  .description(
    'CLI and library for Palo Alto Prisma AIRS — guardrail refinement, AI red teaming, model security scanning',
  )
  .version('1.7.2');

registerGenerateCommand(program);
registerResumeCommand(program);
registerReportCommand(program);
registerListCommand(program);
registerRedteamCommand(program);
registerModelSecurityCommand(program);
registerAuditCommand(program);

program.parse();
