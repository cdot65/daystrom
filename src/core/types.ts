/**
 * Core domain types — shared across all Daystrom modules.
 */

// ---------------------------------------------------------------------------
// Topic definition — the guardrail artifact generated and refined by the loop
// ---------------------------------------------------------------------------
export interface CustomTopic {
  name: string;
  description: string;
  examples: string[];
}

// ---------------------------------------------------------------------------
// User input — interactive prompt answers that seed a generation run
// ---------------------------------------------------------------------------
export interface UserInput {
  topicDescription: string;
  intent: 'allow' | 'block';
  seedExamples?: string[];
  profileName: string;
  maxIterations?: number;
  targetCoverage?: number;
}

// ---------------------------------------------------------------------------
// Testing — prompt test cases and their scan results
// ---------------------------------------------------------------------------
export interface TestCase {
  prompt: string;
  expectedTriggered: boolean;
  category: string;
}

export interface TestResult {
  testCase: TestCase;
  actualTriggered: boolean;
  scanAction: 'allow' | 'block';
  scanId: string;
  reportId: string;
  correct: boolean;
}

// ---------------------------------------------------------------------------
// Evaluation — efficacy metrics and LLM analysis of scan results
// ---------------------------------------------------------------------------
export interface EfficacyMetrics {
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  truePositiveRate: number;
  trueNegativeRate: number;
  accuracy: number;
  coverage: number;
  f1Score: number;
}

export interface AnalysisReport {
  summary: string;
  falsePositivePatterns: string[];
  falseNegativePatterns: string[];
  suggestions: string[];
}

// ---------------------------------------------------------------------------
// Iteration & run state — tracks progress across the refinement loop
// ---------------------------------------------------------------------------
export interface IterationResult {
  iteration: number;
  timestamp: string;
  topic: CustomTopic;
  testCases: TestCase[];
  testResults: TestResult[];
  metrics: EfficacyMetrics;
  analysis: AnalysisReport;
  durationMs: number;
}

export interface RunState {
  id: string;
  createdAt: string;
  updatedAt: string;
  userInput: UserInput;
  iterations: IterationResult[];
  currentIteration: number;
  bestIteration: number;
  bestCoverage: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
}

// ---------------------------------------------------------------------------
// Loop events — discriminated union yielded by the async generator loop
// ---------------------------------------------------------------------------
export type LoopEvent =
  | { type: 'iteration:start'; iteration: number }
  | { type: 'generate:complete'; topic: CustomTopic }
  | { type: 'apply:complete'; topicId: string }
  | { type: 'test:progress'; completed: number; total: number }
  | { type: 'evaluate:complete'; metrics: EfficacyMetrics }
  | { type: 'analyze:complete'; analysis: AnalysisReport }
  | { type: 'iteration:complete'; result: IterationResult }
  | { type: 'loop:complete'; bestResult: IterationResult; runState: RunState }
  | { type: 'loop:paused'; runState: RunState }
  | { type: 'memory:loaded'; learningCount: number }
  | { type: 'memory:extracted'; learningCount: number };
