import type { Command } from 'commander';
import { SdkPromptSetService } from '../../airs/promptsets.js';
import { SdkRedTeamService } from '../../airs/redteam.js';
import { loadConfig } from '../../config/loader.js';
import {
  renderAttackList,
  renderCategories,
  renderCustomAttackList,
  renderCustomReport,
  renderError,
  renderPromptSetList,
  renderRedteamHeader,
  renderScanList,
  renderScanProgress,
  renderScanStatus,
  renderStaticReport,
  renderTargetList,
} from '../renderer.js';

/** Create an SdkRedTeamService from config. */
async function createService() {
  const config = await loadConfig();
  return new SdkRedTeamService({
    clientId: config.mgmtClientId,
    clientSecret: config.mgmtClientSecret,
    tsgId: config.mgmtTsgId,
    tokenEndpoint: config.mgmtTokenEndpoint,
  });
}

/** Register the `redteam` command group. */
export function registerRedteamCommand(program: Command): void {
  const redteam = program.command('redteam').description('AI Red Team scan operations');

  // -----------------------------------------------------------------------
  // redteam scan — execute a red team scan
  // -----------------------------------------------------------------------
  redteam
    .command('scan')
    .description('Execute a red team scan against a target')
    .requiredOption('--target <uuid>', 'Target UUID')
    .requiredOption('--name <name>', 'Scan name')
    .option('--type <type>', 'Job type: STATIC, DYNAMIC, or CUSTOM', 'STATIC')
    .option('--categories <json>', 'Category filter JSON (STATIC scans)')
    .option('--prompt-sets <uuids>', 'Comma-separated prompt set UUIDs (CUSTOM scans)')
    .option('--no-wait', 'Submit scan without waiting for completion')
    .action(async (opts) => {
      try {
        renderRedteamHeader();
        const service = await createService();

        let categories: Record<string, unknown> | undefined;
        if (opts.categories) {
          categories = JSON.parse(opts.categories);
        }

        const customPromptSets = opts.promptSets
          ? (opts.promptSets as string).split(',').map((s: string) => s.trim())
          : undefined;

        console.log(`  Creating ${opts.type} scan "${opts.name}"...`);
        const job = await service.createScan({
          name: opts.name,
          targetUuid: opts.target,
          jobType: opts.type,
          categories,
          customPromptSets,
        });

        renderScanStatus(job);

        if (opts.wait !== false) {
          console.log('  Waiting for completion...\n');
          const completed = await service.waitForCompletion(job.uuid, (progress) =>
            renderScanProgress(progress),
          );
          console.log('\n');
          renderScanStatus(completed);
          console.log(`  Job ID: ${completed.uuid}`);
          console.log('  Run `daystrom redteam report <jobId>` to view results.\n');
        } else {
          console.log(`  Job ID: ${job.uuid}`);
          console.log('  Run `daystrom redteam status <jobId>` to check progress.\n');
        }
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // -----------------------------------------------------------------------
  // redteam status — check scan status
  // -----------------------------------------------------------------------
  redteam
    .command('status <jobId>')
    .description('Check scan status')
    .action(async (jobId: string) => {
      try {
        renderRedteamHeader();
        const service = await createService();
        const job = await service.getScan(jobId);
        renderScanStatus(job);
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // -----------------------------------------------------------------------
  // redteam report — view scan report
  // -----------------------------------------------------------------------
  redteam
    .command('report <jobId>')
    .description('View scan report')
    .option('--attacks', 'Include attack list', false)
    .option('--severity <level>', 'Filter attacks by severity')
    .option('--limit <n>', 'Max attacks to show', '20')
    .action(async (jobId: string, opts) => {
      try {
        renderRedteamHeader();
        const service = await createService();
        const job = await service.getScan(jobId);
        renderScanStatus(job);

        if (job.jobType === 'CUSTOM') {
          const report = await service.getCustomReport(jobId);
          renderCustomReport(report);
        } else {
          const report = await service.getStaticReport(jobId);
          renderStaticReport(report);
        }

        if (opts.attacks) {
          if (job.jobType === 'CUSTOM') {
            const attacks = await service.listCustomAttacks(jobId, {
              limit: Number.parseInt(opts.limit, 10),
            });
            renderCustomAttackList(attacks);
          } else {
            const attacks = await service.listAttacks(jobId, {
              severity: opts.severity,
              limit: Number.parseInt(opts.limit, 10),
            });
            renderAttackList(attacks);
          }
        }
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // -----------------------------------------------------------------------
  // redteam list — list recent scans
  // -----------------------------------------------------------------------
  redteam
    .command('list')
    .description('List recent scans')
    .option('--status <status>', 'Filter by status (QUEUED, RUNNING, COMPLETED, FAILED, ABORTED)')
    .option('--type <type>', 'Filter by job type (STATIC, DYNAMIC, CUSTOM)')
    .option('--target <uuid>', 'Filter by target UUID')
    .option('--limit <n>', 'Max results', '10')
    .action(async (opts) => {
      try {
        renderRedteamHeader();
        const service = await createService();
        const scans = await service.listScans({
          status: opts.status,
          jobType: opts.type,
          targetId: opts.target,
          limit: Number.parseInt(opts.limit, 10),
        });
        renderScanList(scans);
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // -----------------------------------------------------------------------
  // redteam targets — list configured targets
  // -----------------------------------------------------------------------
  redteam
    .command('targets')
    .description('List configured red team targets')
    .action(async () => {
      try {
        renderRedteamHeader();
        const service = await createService();
        const targets = await service.listTargets();
        renderTargetList(targets);
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // -----------------------------------------------------------------------
  // redteam categories — list attack categories
  // -----------------------------------------------------------------------
  redteam
    .command('categories')
    .description('List available attack categories')
    .action(async () => {
      try {
        renderRedteamHeader();
        const service = await createService();
        const categories = await service.getCategories();
        renderCategories(categories);
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // -----------------------------------------------------------------------
  // redteam prompt-sets — list custom prompt sets
  // -----------------------------------------------------------------------
  redteam
    .command('prompt-sets')
    .description('List custom prompt sets')
    .action(async () => {
      try {
        renderRedteamHeader();
        const config = await loadConfig();
        const service = new SdkPromptSetService({
          clientId: config.mgmtClientId,
          clientSecret: config.mgmtClientSecret,
          tsgId: config.mgmtTsgId,
          tokenEndpoint: config.mgmtTokenEndpoint,
        });
        const sets = await service.listPromptSets();
        renderPromptSetList(sets);
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // -----------------------------------------------------------------------
  // redteam abort — abort a running scan
  // -----------------------------------------------------------------------
  redteam
    .command('abort <jobId>')
    .description('Abort a running scan')
    .action(async (jobId: string) => {
      try {
        renderRedteamHeader();
        const service = await createService();
        await service.abortScan(jobId);
        console.log(`  Scan ${jobId} aborted.\n`);
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
