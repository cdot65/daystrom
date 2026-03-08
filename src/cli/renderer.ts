import chalk from 'chalk';
import type {
  AnalysisReport,
  CustomTopic,
  EfficacyMetrics,
  IterationResult,
  RunState,
} from '../core/types.js';
import type { RunStateSummary } from '../persistence/types.js';

/** Render the application banner. */
export function renderHeader(): void {
  console.log(chalk.bold.cyan('\n  Prisma AIRS Guardrail Generator'));
  console.log(chalk.dim('  Iterative custom topic refinement\n'));
}

/** Render iteration number header. */
export function renderIterationStart(iteration: number): void {
  console.log(chalk.bold(`\n━━━ Iteration ${iteration} ━━━`));
}

/** Render a topic's name, description, and examples. */
export function renderTopic(topic: CustomTopic): void {
  console.log(chalk.bold('  Topic:'));
  console.log(`    Name: ${chalk.white(topic.name)}`);
  console.log(`    Desc: ${chalk.white(topic.description)}`);
  console.log('    Examples:');
  for (const ex of topic.examples) {
    console.log(`      ${chalk.dim('•')} ${ex}`);
  }
}

/** Render a scan progress bar with percentage. */
export function renderTestProgress(completed: number, total: number): void {
  const pct = Math.round((completed / total) * 100);
  const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
  process.stdout.write(`\r  Scanning: ${bar} ${pct}% (${completed}/${total})`);
  if (completed === total) console.log();
}

/** Render efficacy metrics with color-coded coverage. */
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

/** Render analysis summary with FP/FN pattern details. */
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

/** Render loop completion summary with best iteration and run ID. */
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

/** Render a list of saved runs with status, coverage, and topic description. */
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

/** Render an error message to stderr. */
export function renderError(message: string): void {
  console.error(chalk.red(`\n  Error: ${message}\n`));
}

/** Render a one-line iteration summary with duration and coverage. */
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

/** Render memory loading status (count of learnings loaded or "none found"). */
export function renderMemoryLoaded(learningCount: number): void {
  if (learningCount > 0) {
    console.log(chalk.cyan(`  Memory: loaded ${learningCount} learnings from previous runs`));
  } else {
    console.log(chalk.dim('  Memory: no previous learnings found'));
  }
}

/** Render count of learnings extracted from the current run. */
export function renderMemoryExtracted(learningCount: number): void {
  console.log(chalk.cyan(`  Memory: extracted ${learningCount} learnings from this run`));
}

// ---------------------------------------------------------------------------
// Red Team rendering
// ---------------------------------------------------------------------------

/** Render the red team banner. */
export function renderRedteamHeader(): void {
  console.log(chalk.bold.red('\n  Prisma AIRS — AI Red Team'));
  console.log(chalk.dim('  Adversarial scan operations\n'));
}

type ChalkFn = (text: string) => string;

/** Severity → chalk color mapping. */
function severityColor(severity: string): ChalkFn {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return chalk.red;
    case 'HIGH':
      return chalk.magenta;
    case 'MEDIUM':
      return chalk.yellow;
    case 'LOW':
      return chalk.cyan;
    default:
      return chalk.dim;
  }
}

/** Status → chalk color mapping. */
function statusColor(status: string): ChalkFn {
  switch (status) {
    case 'COMPLETED':
      return chalk.green;
    case 'RUNNING':
      return chalk.blue;
    case 'QUEUED':
    case 'INIT':
      return chalk.yellow;
    case 'FAILED':
    case 'ABORTED':
      return chalk.red;
    case 'PARTIALLY_COMPLETE':
      return chalk.yellow;
    default:
      return chalk.white;
  }
}

/** Render a scan's status summary. */
export function renderScanStatus(job: {
  uuid: string;
  name: string;
  status: string;
  jobType: string;
  targetName?: string;
  score?: number | null;
  asr?: number | null;
  completed?: number | null;
  total?: number | null;
}): void {
  console.log(chalk.bold('  Scan Status:'));
  console.log(`    ID:      ${chalk.dim(job.uuid)}`);
  console.log(`    Name:    ${job.name}`);
  console.log(`    Type:    ${job.jobType}`);
  if (job.targetName) console.log(`    Target:  ${job.targetName}`);
  console.log(`    Status:  ${statusColor(job.status)(job.status)}`);
  if (job.total != null && job.completed != null) {
    console.log(`    Progress: ${job.completed}/${job.total}`);
  }
  if (job.score != null) console.log(`    Score:   ${job.score}`);
  if (job.asr != null) console.log(`    ASR:     ${(job.asr * 100).toFixed(1)}%`);
  console.log();
}

/** Render a table of scans. */
export function renderScanList(
  jobs: Array<{
    uuid: string;
    name: string;
    status: string;
    jobType: string;
    score?: number | null;
    createdAt?: string | null;
  }>,
): void {
  if (jobs.length === 0) {
    console.log(chalk.dim('  No scans found.\n'));
    return;
  }
  console.log(chalk.bold('\n  Recent Scans:\n'));
  for (const job of jobs) {
    console.log(`  ${chalk.dim(job.uuid)}`);
    console.log(
      `    ${job.name}  ${statusColor(job.status)(job.status)}  ${job.jobType}${job.score != null ? `  score: ${job.score}` : ''}`,
    );
    if (job.createdAt) console.log(`    ${chalk.dim(job.createdAt)}`);
    console.log();
  }
}

/** Render a static scan report. */
export function renderStaticReport(report: {
  score?: number | null;
  asr?: number | null;
  severityBreakdown: Array<{ severity: string; successful: number; failed: number }>;
  reportSummary?: string | null;
  categories: Array<{
    id: string;
    displayName: string;
    asr: number;
    successful: number;
    failed: number;
    total: number;
  }>;
}): void {
  console.log(chalk.bold('\n  Static Scan Report:'));
  if (report.score != null) console.log(`    Score: ${report.score}`);
  if (report.asr != null) console.log(`    ASR:   ${(report.asr * 100).toFixed(1)}%`);

  if (report.severityBreakdown.length > 0) {
    console.log(chalk.bold('\n  Severity Breakdown:'));
    for (const s of report.severityBreakdown) {
      const color = severityColor(s.severity);
      console.log(
        `    ${color(s.severity.padEnd(10))} ${chalk.red(`${s.successful} bypassed`)}  ${chalk.green(`${s.failed} blocked`)}`,
      );
    }
  }

  if (report.categories.length > 0) {
    console.log(chalk.bold('\n  Categories:'));
    for (const c of report.categories) {
      const asrPct = (c.asr * 100).toFixed(1);
      console.log(`    ${c.displayName.padEnd(30)} ASR: ${asrPct}%  (${c.successful}/${c.total})`);
    }
  }

  if (report.reportSummary) {
    console.log(chalk.bold('\n  Summary:'));
    console.log(`    ${report.reportSummary}`);
  }
  console.log();
}

/** Render a custom attack report. */
export function renderCustomReport(report: {
  totalPrompts: number;
  totalAttacks: number;
  totalThreats: number;
  score: number;
  asr: number;
  promptSets: Array<{
    promptSetName: string;
    totalPrompts: number;
    totalThreats: number;
    threatRate: number;
  }>;
}): void {
  console.log(chalk.bold('\n  Custom Attack Report:'));
  console.log(`    Score:   ${report.score}`);
  console.log(`    ASR:     ${(report.asr * 100).toFixed(1)}%`);
  console.log(`    Attacks: ${report.totalAttacks}  Threats: ${report.totalThreats}`);

  if (report.promptSets.length > 0) {
    console.log(chalk.bold('\n  Prompt Sets:'));
    for (const ps of report.promptSets) {
      console.log(
        `    ${ps.promptSetName.padEnd(40)} ${ps.totalThreats}/${ps.totalPrompts} threats  (${(ps.threatRate * 100).toFixed(1)}%)`,
      );
    }
  }
  console.log();
}

/** Render attack list with severity coloring. */
export function renderAttackList(
  attacks: Array<{
    name: string;
    severity?: string;
    category?: string;
    successful: boolean;
  }>,
): void {
  if (attacks.length === 0) {
    console.log(chalk.dim('  No attacks found.\n'));
    return;
  }
  console.log(chalk.bold('\n  Attacks:\n'));
  for (const a of attacks) {
    const sev = a.severity
      ? severityColor(a.severity)(a.severity.padEnd(10))
      : chalk.dim('N/A'.padEnd(10));
    const result = a.successful ? chalk.red('BYPASSED') : chalk.green('BLOCKED');
    console.log(
      `    ${sev} ${result}  ${a.name}${a.category ? chalk.dim(` [${a.category}]`) : ''}`,
    );
  }
  console.log();
}

/** Render target list. */
export function renderTargetList(
  targets: Array<{
    uuid: string;
    name: string;
    status: string;
    targetType?: string;
    active: boolean;
  }>,
): void {
  if (targets.length === 0) {
    console.log(chalk.dim('  No targets found.\n'));
    return;
  }
  console.log(chalk.bold('\n  Targets:\n'));
  for (const t of targets) {
    console.log(`  ${chalk.dim(t.uuid)}`);
    console.log(
      `    ${t.name}  ${statusColor(t.active ? 'COMPLETED' : 'FAILED')(t.active ? 'active' : 'inactive')}${t.targetType ? `  type: ${t.targetType}` : ''}`,
    );
  }
  console.log();
}

/** Render attack category tree. */
export function renderCategories(
  categories: Array<{
    id: string;
    displayName: string;
    description?: string;
    subCategories: Array<{ id: string; displayName: string; description?: string }>;
  }>,
): void {
  if (categories.length === 0) {
    console.log(chalk.dim('  No categories found.\n'));
    return;
  }
  console.log(chalk.bold('\n  Attack Categories:\n'));
  for (const c of categories) {
    console.log(
      `  ${chalk.bold(c.displayName)}${c.description ? chalk.dim(` — ${c.description}`) : ''}`,
    );
    for (const sc of c.subCategories) {
      console.log(
        `    ${chalk.dim('•')} ${sc.displayName}${sc.description ? chalk.dim(` — ${sc.description}`) : ''}`,
      );
    }
    console.log();
  }
}

/** Render polling progress inline. */
export function renderScanProgress(job: {
  status: string;
  completed?: number | null;
  total?: number | null;
}): void {
  if (job.total != null && job.completed != null && job.total > 0) {
    const pct = Math.round((job.completed / job.total) * 100);
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
    process.stdout.write(
      `\r  ${statusColor(job.status)(job.status)} ${bar} ${pct}% (${job.completed}/${job.total})`,
    );
  } else {
    process.stdout.write(`\r  ${statusColor(job.status)(job.status)}...`);
  }
}

// ---------------------------------------------------------------------------
// Guardrail loop rendering
// ---------------------------------------------------------------------------

/** Render accumulated test count with optional dropped info. */
export function renderTestsAccumulated(
  newCount: number,
  totalCount: number,
  droppedCount: number,
): void {
  let msg = `  Tests: ${newCount} new, ${totalCount} total (accumulated)`;
  if (droppedCount > 0) {
    msg += chalk.yellow(` (${droppedCount} dropped by cap)`);
  }
  console.log(chalk.dim(msg));
}
