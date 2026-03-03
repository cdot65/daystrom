import chalk from 'chalk';
import type { Command } from 'commander';
import { loadConfig } from '../../config/loader.js';
import { JsonFileStore } from '../../persistence/store.js';
import {
  renderAnalysis,
  renderError,
  renderHeader,
  renderMetrics,
  renderTopic,
} from '../renderer.js';

export function registerReportCommand(program: Command): void {
  program
    .command('report <runId>')
    .description('View detailed report for a run')
    .option('--iteration <n>', 'Show specific iteration')
    .action(async (runId: string, opts) => {
      try {
        renderHeader();
        const config = await loadConfig();
        const store = new JsonFileStore(config.dataDir);
        const run = await store.load(runId);

        if (!run) {
          renderError(`Run ${runId} not found`);
          process.exit(1);
        }

        console.log(chalk.bold(`\n  Run: ${run.id}`));
        console.log(`  Status: ${run.status}`);
        console.log(`  Created: ${run.createdAt}`);
        console.log(`  Topic: ${run.userInput.topicDescription}`);
        console.log(`  Intent: ${run.userInput.intent}`);
        console.log(
          `  Best coverage: ${(run.bestCoverage * 100).toFixed(1)}% (iteration ${run.bestIteration})`,
        );
        console.log(`  Total iterations: ${run.iterations.length}`);

        if (opts.iteration) {
          const idx = Number.parseInt(opts.iteration, 10) - 1;
          const iter = run.iterations[idx];
          if (!iter) {
            renderError(`Iteration ${opts.iteration} not found`);
            process.exit(1);
          }
          console.log(chalk.bold(`\n  Iteration ${iter.iteration}:`));
          renderTopic(iter.topic);
          renderMetrics(iter.metrics);
          renderAnalysis(iter.analysis);
        } else {
          // Show best iteration
          const best = run.iterations[run.bestIteration - 1];
          if (best) {
            console.log(chalk.bold(`\n  Best Iteration (${best.iteration}):`));
            renderTopic(best.topic);
            renderMetrics(best.metrics);
            renderAnalysis(best.analysis);
          }
        }
        console.log();
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
