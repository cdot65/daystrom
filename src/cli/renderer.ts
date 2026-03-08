import chalk from 'chalk';
import type { AuditResult, ConflictPair, ProfileTopic } from '../audit/types.js';
import type {
  AnalysisReport,
  CustomTopic,
  EfficacyMetrics,
  IterationResult,
  RunState,
  TestResult,
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
  let countsLine = `    TP: ${metrics.truePositives}  TN: ${metrics.trueNegatives}  FP: ${metrics.falsePositives}  FN: ${metrics.falseNegatives}`;
  if (metrics.regressionCount > 0) {
    countsLine += chalk.red(`  Regressions: ${metrics.regressionCount}`);
  }
  console.log(chalk.dim(countsLine));
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

/** Render per-test-case results table. */
export function renderTestResults(results: TestResult[]): void {
  console.log(chalk.bold('\n  Test Results:'));
  for (const r of results) {
    const icon = r.correct ? chalk.green('✓') : chalk.red('✗');
    const expected = r.testCase.expectedTriggered ? 'triggered' : 'safe';
    const actual = r.actualTriggered ? 'triggered' : 'safe';
    const status = r.correct ? '' : chalk.red(` (expected ${expected}, got ${actual})`);
    console.log(`    ${icon} ${r.testCase.prompt}${status}`);
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
  if (job.asr != null) console.log(`    ASR:     ${job.asr.toFixed(1)}%`);
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
  if (report.asr != null) console.log(`    ASR:   ${report.asr.toFixed(1)}%`);

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
      console.log(
        `    ${c.displayName.padEnd(30)} ASR: ${c.asr.toFixed(1)}%  (${c.successful}/${c.total})`,
      );
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
  console.log(`    ASR:     ${report.asr.toFixed(1)}%`);
  console.log(`    Attacks: ${report.totalAttacks}  Threats: ${report.totalThreats}`);

  if (report.promptSets.length > 0) {
    console.log(chalk.bold('\n  Prompt Sets:'));
    for (const ps of report.promptSets) {
      console.log(
        `    ${ps.promptSetName.padEnd(40)} ${ps.totalThreats}/${ps.totalPrompts} threats  (${ps.threatRate.toFixed(1)}%)`,
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

/** Render custom attack list (prompt-level results). */
export function renderCustomAttackList(
  attacks: Array<{
    promptText: string;
    goal?: string;
    threat: boolean;
    asr?: number;
    promptSetName?: string;
  }>,
): void {
  if (attacks.length === 0) {
    console.log(chalk.dim('  No custom attacks found.\n'));
    return;
  }
  console.log(chalk.bold('\n  Custom Attacks:\n'));
  for (const a of attacks) {
    const result = a.threat ? chalk.red('THREAT') : chalk.green('SAFE');
    const prompt = a.promptText.length > 80 ? `${a.promptText.substring(0, 77)}...` : a.promptText;
    const asrStr = a.asr != null ? chalk.dim(` ASR: ${a.asr.toFixed(1)}%`) : '';
    console.log(`    ${result}${asrStr}  ${prompt}`);
    if (a.goal) console.log(`      ${chalk.dim(a.goal)}`);
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

/** Render prompt set list. */
export function renderPromptSetList(
  promptSets: Array<{ uuid: string; name: string; active: boolean }>,
): void {
  if (promptSets.length === 0) {
    console.log(chalk.dim('  No prompt sets found.\n'));
    return;
  }
  console.log(chalk.bold('\n  Prompt Sets:\n'));
  for (const ps of promptSets) {
    console.log(`  ${chalk.dim(ps.uuid)}`);
    console.log(
      `    ${ps.name}  ${statusColor(ps.active ? 'COMPLETED' : 'FAILED')(ps.active ? 'active' : 'inactive')}`,
    );
  }
  console.log();
}

/** Render target detail. */
export function renderTargetDetail(target: {
  uuid: string;
  name: string;
  status: string;
  targetType?: string;
  active: boolean;
  connectionParams?: Record<string, unknown>;
  background?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): void {
  console.log(chalk.bold('\n  Target Detail:\n'));
  console.log(`    UUID:   ${chalk.dim(target.uuid)}`);
  console.log(`    Name:   ${target.name}`);
  console.log(
    `    Status: ${statusColor(target.active ? 'COMPLETED' : 'FAILED')(target.active ? 'active' : 'inactive')}`,
  );
  if (target.targetType) console.log(`    Type:   ${target.targetType}`);
  if (target.connectionParams) {
    console.log(chalk.bold('\n    Connection:'));
    for (const [k, v] of Object.entries(target.connectionParams)) {
      console.log(`      ${k}: ${chalk.dim(String(v))}`);
    }
  }
  if (target.background) {
    console.log(chalk.bold('\n    Background:'));
    for (const [k, v] of Object.entries(target.background)) {
      if (v != null) console.log(`      ${k}: ${chalk.dim(String(v))}`);
    }
  }
  if (target.metadata) {
    console.log(chalk.bold('\n    Metadata:'));
    for (const [k, v] of Object.entries(target.metadata)) {
      if (v != null) console.log(`      ${k}: ${chalk.dim(String(v))}`);
    }
  }
  console.log();
}

/** Render prompt set detail. */
export function renderPromptSetDetail(ps: {
  uuid: string;
  name: string;
  active: boolean;
  archive: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}): void {
  console.log(chalk.bold('\n  Prompt Set Detail:\n'));
  console.log(`    UUID:        ${chalk.dim(ps.uuid)}`);
  console.log(`    Name:        ${ps.name}`);
  console.log(
    `    Status:      ${statusColor(ps.active ? 'COMPLETED' : 'FAILED')(ps.active ? 'active' : 'inactive')}`,
  );
  console.log(`    Archived:    ${ps.archive ? 'yes' : 'no'}`);
  if (ps.description) console.log(`    Description: ${ps.description}`);
  if (ps.createdAt) console.log(`    Created:     ${chalk.dim(ps.createdAt)}`);
  if (ps.updatedAt) console.log(`    Updated:     ${chalk.dim(ps.updatedAt)}`);
  console.log();
}

/** Render prompt set version info. */
export function renderVersionInfo(info: {
  uuid: string;
  version: number;
  stats: { total: number; active: number; inactive: number };
}): void {
  console.log(chalk.bold('\n  Version Info:\n'));
  console.log(`    Version:  ${info.version}`);
  console.log(`    Total:    ${info.stats.total}`);
  console.log(`    Active:   ${chalk.green(String(info.stats.active))}`);
  console.log(`    Inactive: ${chalk.dim(String(info.stats.inactive))}`);
  console.log();
}

/** Render a list of prompts. */
export function renderPromptList(
  prompts: Array<{
    uuid: string;
    prompt: string;
    goal?: string;
    active: boolean;
  }>,
): void {
  if (prompts.length === 0) {
    console.log(chalk.dim('  No prompts found.\n'));
    return;
  }
  console.log(chalk.bold('\n  Prompts:\n'));
  for (const p of prompts) {
    const status = p.active ? chalk.green('active') : chalk.dim('inactive');
    const text = p.prompt.length > 80 ? `${p.prompt.substring(0, 77)}...` : p.prompt;
    console.log(`  ${chalk.dim(p.uuid)}  ${status}`);
    console.log(`    ${text}`);
    if (p.goal) console.log(`    ${chalk.dim(`Goal: ${p.goal}`)}`);
  }
  console.log();
}

/** Render prompt detail. */
export function renderPromptDetail(p: {
  uuid: string;
  prompt: string;
  goal?: string;
  active: boolean;
  promptSetId: string;
}): void {
  console.log(chalk.bold('\n  Prompt Detail:\n'));
  console.log(`    UUID:       ${chalk.dim(p.uuid)}`);
  console.log(`    Set UUID:   ${chalk.dim(p.promptSetId)}`);
  console.log(`    Status:     ${p.active ? chalk.green('active') : chalk.dim('inactive')}`);
  console.log(`    Prompt:     ${p.prompt}`);
  if (p.goal) console.log(`    Goal:       ${p.goal}`);
  console.log();
}

/** Render property names list. */
export function renderPropertyNames(names: Array<{ name: string }>): void {
  if (names.length === 0) {
    console.log(chalk.dim('  No property names found.\n'));
    return;
  }
  console.log(chalk.bold('\n  Property Names:\n'));
  for (const n of names) {
    console.log(`    ${chalk.dim('•')} ${n.name}`);
  }
  console.log();
}

/** Render property values. */
export function renderPropertyValues(values: Array<{ name: string; value: string }>): void {
  if (values.length === 0) {
    console.log(chalk.dim('  No property values found.\n'));
    return;
  }
  console.log(chalk.bold('\n  Property Values:\n'));
  for (const v of values) {
    console.log(`    ${v.name}: ${chalk.dim(v.value)}`);
  }
  console.log();
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

/** Render test composition summary (carried failures + regression + generated). */
export function renderTestsComposed(
  generated: number,
  carriedFailures: number,
  regressionTier: number,
  total: number,
): void {
  console.log(
    chalk.dim(
      `  Tests: ${generated} generated, ${carriedFailures} carried failures, ${regressionTier} regression, ${total} total`,
    ),
  );
}

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

// ---------------------------------------------------------------------------
// Audit rendering
// ---------------------------------------------------------------------------

/** Render profile topics discovered during audit. */
export function renderAuditTopics(topics: ProfileTopic[]): void {
  for (const t of topics) {
    const actionColor = t.action === 'block' ? chalk.red : chalk.green;
    console.log(`  ${actionColor(`[${t.action}]`)} ${chalk.bold(t.topicName)}`);
    if (t.description) console.log(chalk.dim(`    ${t.description}`));
  }
  console.log();
}

/** Render audit completion with per-topic metrics table. */
export function renderAuditComplete(result: AuditResult): void {
  console.log(chalk.bold('\n  Per-Topic Results:\n'));
  console.log(
    chalk.dim('  Topic                          Coverage  TPR     TNR     Accuracy  Tests'),
  );
  console.log(chalk.dim(`  ${'─'.repeat(72)}`));
  for (const tr of result.topics) {
    const m = tr.metrics;
    const name = tr.topic.topicName.padEnd(30);
    const cov = `${(m.coverage * 100).toFixed(0)}%`.padStart(6);
    const tpr = `${(m.truePositiveRate * 100).toFixed(0)}%`.padStart(6);
    const tnr = `${(m.trueNegativeRate * 100).toFixed(0)}%`.padStart(6);
    const acc = `${(m.accuracy * 100).toFixed(0)}%`.padStart(6);
    const tests = String(tr.testResults.length).padStart(5);
    const covColor = m.coverage >= 0.9 ? chalk.green : m.coverage >= 0.5 ? chalk.yellow : chalk.red;
    console.log(`  ${name}  ${covColor(cov)}  ${tpr}  ${tnr}  ${acc}  ${tests}`);
  }
}

/** Render detected cross-topic conflicts. */
export function renderConflicts(conflicts: ConflictPair[]): void {
  console.log(chalk.bold.yellow(`\n  Conflicts Detected: ${conflicts.length}\n`));
  for (const c of conflicts) {
    console.log(chalk.yellow(`  ${c.topicA} ↔ ${c.topicB}`));
    console.log(chalk.dim(`    ${c.description}`));
    for (const e of c.evidence.slice(0, 3)) {
      console.log(chalk.dim(`    • "${e}"`));
    }
    if (c.evidence.length > 3) {
      console.log(chalk.dim(`    ...and ${c.evidence.length - 3} more`));
    }
  }
  console.log();
}
