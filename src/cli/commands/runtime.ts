import * as fs from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import chalk from 'chalk';
import type { Command } from 'commander';
import { SdkManagementService } from '../../airs/management.js';
import { SdkRuntimeService } from '../../airs/runtime.js';
import type { RuntimeScanResult } from '../../airs/types.js';
import { loadConfig } from '../../config/loader.js';
import { loadBulkScanState, saveBulkScanState } from '../bulk-scan-state.js';
import { parseInputFile } from '../parse-input.js';
import {
  renderError,
  renderProfileDetail,
  renderProfileList,
  renderRuntimeConfigHeader,
} from '../renderer.js';

function renderScanResult(result: RuntimeScanResult): void {
  const actionColor = result.action === 'block' ? chalk.red : chalk.green;
  console.log(chalk.bold('\n  Scan Result'));
  console.log(chalk.dim('  ─────────────────────────'));
  console.log(`  Action:    ${actionColor(result.action.toUpperCase())}`);
  console.log(`  Category:  ${result.category}`);
  console.log(`  Triggered: ${result.triggered ? chalk.red('yes') : chalk.green('no')}`);
  console.log(`  Scan ID:   ${chalk.dim(result.scanId)}`);
  console.log(`  Report ID: ${chalk.dim(result.reportId)}`);

  const flags = Object.entries(result.detections).filter(([, v]) => v);
  if (flags.length > 0) {
    console.log(chalk.bold('\n  Detections:'));
    for (const [key] of flags) {
      console.log(`    ${chalk.yellow('●')} ${key}`);
    }
  }
  console.log();
}

export function registerRuntimeCommand(program: Command): void {
  const runtime = program
    .command('runtime')
    .description('Runtime prompt scanning against AIRS profiles');

  runtime
    .command('scan <prompt>')
    .description('Scan a single prompt against an AIRS security profile')
    .requiredOption('--profile <name>', 'Security profile name')
    .option('--response <text>', 'Response text to scan alongside the prompt')
    .action(async (prompt: string, opts) => {
      try {
        const config = await loadConfig({});
        if (!config.airsApiKey) {
          renderError('PANW_AI_SEC_API_KEY is required');
          process.exit(1);
        }

        const service = new SdkRuntimeService(config.airsApiKey);
        console.log(chalk.bold.cyan('\n  Prisma AIRS Runtime Scan'));
        console.log(chalk.dim(`  Profile: ${opts.profile}`));
        console.log(
          chalk.dim(`  Prompt:  "${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}"`),
        );

        const result = await service.scanPrompt(opts.profile, prompt, opts.response);
        renderScanResult(result);
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  runtime
    .command('bulk-scan')
    .description('Scan multiple prompts via the async AIRS API')
    .requiredOption('--profile <name>', 'Security profile name')
    .requiredOption(
      '--input <file>',
      'Input file — .csv (extracts prompt column) or .txt (one per line)',
    )
    .option('--output <file>', 'Output CSV file path')
    .option('--session-id <id>', 'Session ID for grouping scans in AIRS dashboard')
    .action(async (opts) => {
      try {
        const config = await loadConfig({});
        if (!config.airsApiKey) {
          renderError('PANW_AI_SEC_API_KEY is required');
          process.exit(1);
        }

        const raw = await readFile(opts.input, 'utf-8');
        const prompts = parseInputFile(raw, opts.input);

        if (prompts.length === 0) {
          renderError('No prompts found in input file');
          process.exit(1);
        }

        const sessionId = opts.sessionId ?? `daystrom-bulk-${Date.now().toString(36)}`;

        const service = new SdkRuntimeService(config.airsApiKey);
        console.log(chalk.bold.cyan('\n  Prisma AIRS Bulk Scan'));
        console.log(chalk.dim(`  Profile:  ${opts.profile}`));
        console.log(chalk.dim(`  Session:  ${sessionId}`));
        console.log(chalk.dim(`  Prompts:  ${prompts.length}`));
        console.log(chalk.dim(`  Batches:  ${Math.ceil(prompts.length / 5)}\n`));

        console.log(chalk.dim('  Submitting async scans...'));
        const scanIds = await service.submitBulkScan(opts.profile, prompts, sessionId);

        const stateDir = config.dataDir.replace(/\/runs$/, '/bulk-scans');
        const statePath = await saveBulkScanState(
          { scanIds, profile: opts.profile, promptCount: prompts.length, sessionId },
          stateDir,
        );
        console.log(chalk.dim(`  Scan IDs saved: ${statePath}`));
        console.log(chalk.dim(`  Submitted ${scanIds.length} batch(es), polling for results...`));

        const results = await service.pollResults(scanIds, undefined, {
          onRetry: (attempt, delayMs) => {
            console.log(
              chalk.yellow(
                `  ⚠ Rate limited — retry ${attempt} in ${(delayMs / 1000).toFixed(0)}s...`,
              ),
            );
          },
        });

        // Attach prompts to results
        for (let i = 0; i < results.length && i < prompts.length; i++) {
          results[i].prompt = prompts[i];
        }

        const outputPath = opts.output ?? `${opts.profile.replace(/\s+/g, '-')}-bulk-scan.csv`;
        const csv = SdkRuntimeService.formatResultsCsv(results);
        await writeFile(outputPath, csv, 'utf-8');

        const blocked = results.filter((r) => r.action === 'block').length;
        const allowed = results.filter((r) => r.action === 'allow').length;

        console.log(chalk.bold('\n  Bulk Scan Complete'));
        console.log(chalk.dim('  ─────────────────────────'));
        console.log(`  Total:   ${results.length}`);
        console.log(`  Blocked: ${chalk.red(String(blocked))}`);
        console.log(`  Allowed: ${chalk.green(String(allowed))}`);
        console.log(`  Output:  ${chalk.cyan(outputPath)}\n`);
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  runtime
    .command('resume-poll <stateFile>')
    .description('Resume polling for a previously submitted bulk scan')
    .option('--output <file>', 'Output CSV file path')
    .action(async (stateFile: string, opts) => {
      try {
        const config = await loadConfig({});
        if (!config.airsApiKey) {
          renderError('PANW_AI_SEC_API_KEY is required');
          process.exit(1);
        }

        const state = await loadBulkScanState(stateFile);
        const service = new SdkRuntimeService(config.airsApiKey);

        console.log(chalk.bold.cyan('\n  Prisma AIRS Resume Poll'));
        console.log(chalk.dim(`  Profile:  ${state.profile}`));
        console.log(chalk.dim(`  Scan IDs: ${state.scanIds.length}`));
        console.log(chalk.dim(`  Prompts:  ${state.promptCount}\n`));

        console.log(chalk.dim('  Polling for results...'));
        const results = await service.pollResults(state.scanIds, undefined, {
          onRetry: (attempt, delayMs) => {
            console.log(
              chalk.yellow(
                `  ⚠ Rate limited — retry ${attempt} in ${(delayMs / 1000).toFixed(0)}s...`,
              ),
            );
          },
        });

        const outputPath = opts.output ?? `${state.profile.replace(/\s+/g, '-')}-bulk-scan.csv`;
        const csv = SdkRuntimeService.formatResultsCsv(results);
        await writeFile(outputPath, csv, 'utf-8');

        const blocked = results.filter((r) => r.action === 'block').length;
        const allowed = results.filter((r) => r.action === 'allow').length;

        console.log(chalk.bold('\n  Resume Poll Complete'));
        console.log(chalk.dim('  ─────────────────────────'));
        console.log(`  Total:   ${results.length}`);
        console.log(`  Blocked: ${chalk.red(String(blocked))}`);
        console.log(`  Allowed: ${chalk.green(String(allowed))}`);
        console.log(`  Output:  ${chalk.cyan(outputPath)}\n`);
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // -----------------------------------------------------------------------
  // runtime profiles — security profile CRUD subcommands
  // -----------------------------------------------------------------------
  const profiles = runtime.command('profiles').description('Manage AIRS security profiles');

  /** Create a management service from config. */
  async function createMgmtService() {
    const config = await loadConfig();
    return new SdkManagementService({
      clientId: config.mgmtClientId,
      clientSecret: config.mgmtClientSecret,
      tsgId: config.mgmtTsgId,
      tokenEndpoint: config.mgmtTokenEndpoint,
    });
  }

  profiles
    .command('list')
    .description('List security profiles')
    .option('--limit <n>', 'Max results', '100')
    .option('--offset <n>', 'Starting offset', '0')
    .action(async (opts) => {
      try {
        renderRuntimeConfigHeader();
        const service = await createMgmtService();
        const result = await service.listProfiles({
          limit: Number.parseInt(opts.limit, 10),
          offset: Number.parseInt(opts.offset, 10),
        });
        renderProfileList(result.profiles);
        if (result.nextOffset != null) {
          console.log(chalk.dim(`  Next offset: ${result.nextOffset}\n`));
        }
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  profiles
    .command('create')
    .description('Create a new security profile')
    .requiredOption('--config <path>', 'JSON file with profile configuration')
    .action(async (opts) => {
      try {
        renderRuntimeConfigHeader();
        const service = await createMgmtService();
        const config = JSON.parse(fs.readFileSync(opts.config, 'utf-8'));
        const profile = await service.createProfile(config);
        console.log(`  Profile created: ${profile.profileId}\n`);
        renderProfileDetail(profile);
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  profiles
    .command('update <profileId>')
    .description('Update a security profile')
    .requiredOption('--config <path>', 'JSON file with profile updates')
    .action(async (profileId: string, opts) => {
      try {
        renderRuntimeConfigHeader();
        const service = await createMgmtService();
        const config = JSON.parse(fs.readFileSync(opts.config, 'utf-8'));
        const profile = await service.updateProfile(profileId, config);
        console.log(`  Profile updated: ${profile.profileId}\n`);
        renderProfileDetail(profile);
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  profiles
    .command('delete <profileId>')
    .description('Delete a security profile')
    .option('--force', 'Force delete (removes from referencing policies)')
    .option('--updated-by <email>', 'Email of user performing force deletion')
    .action(async (profileId: string, opts) => {
      try {
        renderRuntimeConfigHeader();
        const service = await createMgmtService();
        if (opts.force) {
          if (!opts.updatedBy) {
            renderError('--updated-by <email> is required with --force');
            process.exit(1);
          }
          const result = await service.forceDeleteProfile(profileId, opts.updatedBy);
          console.log(`  ${result.message}\n`);
        } else {
          const result = await service.deleteProfile(profileId);
          console.log(`  ${result.message}\n`);
        }
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
