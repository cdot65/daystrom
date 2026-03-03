import chalk from 'chalk';
import type {
  AnalysisReport,
  CustomTopic,
  EfficacyMetrics,
  IterationResult,
  RunState,
} from '../core/types.js';
import type { RunStateSummary } from '../persistence/types.js';

export function renderHeader(): void {
  console.log(chalk.bold.cyan('\n  Prisma AIRS Guardrail Generator'));
  console.log(chalk.dim('  Iterative custom topic refinement\n'));
}

export function renderIterationStart(iteration: number): void {
  console.log(chalk.bold(`\n━━━ Iteration ${iteration} ━━━`));
}

export function renderTopic(topic: CustomTopic): void {
  console.log(chalk.bold('  Topic:'));
  console.log(`    Name: ${chalk.white(topic.name)}`);
  console.log(`    Desc: ${chalk.white(topic.description)}`);
  console.log('    Examples:');
  for (const ex of topic.examples) {
    console.log(`      ${chalk.dim('•')} ${ex}`);
  }
}

export function renderTestProgress(completed: number, total: number): void {
  const pct = Math.round((completed / total) * 100);
  const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
  process.stdout.write(`\r  Scanning: ${bar} ${pct}% (${completed}/${total})`);
  if (completed === total) console.log();
}

export function renderMetrics(metrics: EfficacyMetrics): void {
  const coverageColor =
    metrics.coverage >= 0.9 ? chalk.green : metrics.coverage >= 0.7 ? chalk.yellow : chalk.red;

  console.log(chalk.bold('\n  Metrics:'));
  console.log(`    Coverage:  ${coverageColor(`${(metrics.coverage * 100).toFixed(1)}%`)}`);
  console.log(`    Accuracy:  ${(metrics.accuracy * 100).toFixed(1)}%`);
  console.log(`    TPR:       ${(metrics.truePositiveRate * 100).toFixed(1)}%`);
  console.log(`    TNR:       ${(metrics.trueNegativeRate * 100).toFixed(1)}%`);
  console.log(`    F1 Score:  ${metrics.f1Score.toFixed(3)}`);
  console.log(
    chalk.dim(
      `    TP: ${metrics.truePositives}  TN: ${metrics.trueNegatives}  FP: ${metrics.falsePositives}  FN: ${metrics.falseNegatives}`,
    ),
  );
}

export function renderAnalysis(analysis: AnalysisReport): void {
  console.log(chalk.bold('\n  Analysis:'));
  console.log(`    ${analysis.summary}`);
  if (analysis.falsePositivePatterns.length > 0) {
    console.log(chalk.yellow('    FP patterns:'));
    for (const p of analysis.falsePositivePatterns) {
      console.log(`      ${chalk.dim('•')} ${p}`);
    }
  }
  if (analysis.falseNegativePatterns.length > 0) {
    console.log(chalk.red('    FN patterns:'));
    for (const p of analysis.falseNegativePatterns) {
      console.log(`      ${chalk.dim('•')} ${p}`);
    }
  }
}

export function renderLoopComplete(runState: RunState): void {
  const best = runState.iterations[runState.bestIteration - 1];
  console.log(chalk.bold.green('\n━━━ Complete ━━━'));
  console.log(
    `  Best iteration: ${runState.bestIteration} (coverage: ${(runState.bestCoverage * 100).toFixed(1)}%)`,
  );
  console.log(`  Total iterations: ${runState.iterations.length}`);
  if (best) {
    renderTopic(best.topic);
  }
  console.log(`\n  Run ID: ${chalk.dim(runState.id)}\n`);
}

export function renderRunList(runs: RunStateSummary[]): void {
  if (runs.length === 0) {
    console.log(chalk.dim('  No saved runs found.\n'));
    return;
  }
  console.log(chalk.bold('\n  Saved Runs:\n'));
  for (const run of runs) {
    const statusColor =
      run.status === 'completed'
        ? chalk.green
        : run.status === 'running'
          ? chalk.blue
          : run.status === 'paused'
            ? chalk.yellow
            : chalk.red;
    console.log(`  ${chalk.dim(run.id)}`);
    console.log(
      `    Status: ${statusColor(run.status)}  Coverage: ${(run.bestCoverage * 100).toFixed(1)}%  Iterations: ${run.currentIteration}`,
    );
    console.log(`    Topic: ${run.topicDescription}`);
    console.log(`    Created: ${run.createdAt}\n`);
  }
}

export function renderError(message: string): void {
  console.error(chalk.red(`\n  Error: ${message}\n`));
}

export function renderIterationSummary(result: IterationResult): void {
  const coverageColor =
    result.metrics.coverage >= 0.9
      ? chalk.green
      : result.metrics.coverage >= 0.7
        ? chalk.yellow
        : chalk.red;
  console.log(
    `  ${chalk.dim(`[${result.durationMs}ms]`)} Coverage: ${coverageColor(`${(result.metrics.coverage * 100).toFixed(1)}%`)} | Accuracy: ${(result.metrics.accuracy * 100).toFixed(1)}%`,
  );
}

export function renderMemoryLoaded(learningCount: number): void {
  if (learningCount > 0) {
    console.log(chalk.cyan(`  Memory: loaded ${learningCount} learnings from previous runs`));
  } else {
    console.log(chalk.dim('  Memory: no previous learnings found'));
  }
}

export function renderMemoryExtracted(learningCount: number): void {
  console.log(chalk.cyan(`  Memory: extracted ${learningCount} learnings from this run`));
}
