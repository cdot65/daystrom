import { nanoid } from 'nanoid';
import type {
  CustomTopic,
  TestCase,
  TestResult,
  AnalysisReport,
  EfficacyMetrics,
  IterationResult,
  RunState,
  UserInput,
  LoopEvent,
} from './types.js';
import { computeMetrics } from './metrics.js';
import type { ManagementClient, ScanService, ScanResult } from '../airs/types.js';

export interface LlmService {
  generateTopic(
    description: string,
    intent: string,
    seeds?: string[],
  ): Promise<CustomTopic>;
  generateTests(
    topic: CustomTopic,
    intent: string,
  ): Promise<{ positiveTests: TestCase[]; negativeTests: TestCase[] }>;
  analyzeResults(
    topic: CustomTopic,
    results: TestResult[],
    metrics: EfficacyMetrics,
  ): Promise<AnalysisReport>;
  improveTopic(
    topic: CustomTopic,
    metrics: EfficacyMetrics,
    analysis: AnalysisReport,
    results: TestResult[],
    iteration: number,
    targetCoverage: number,
  ): Promise<CustomTopic>;
}

export interface LoopDependencies {
  llm: LlmService;
  management: ManagementClient;
  scanner: ScanService;
  propagationDelayMs?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* runLoop(
  input: UserInput,
  deps: LoopDependencies,
): AsyncGenerator<LoopEvent> {
  const maxIterations = input.maxIterations ?? 20;
  const targetCoverage = input.targetCoverage ?? 0.9;
  const propagationDelay = deps.propagationDelayMs ?? 10000;

  const runState: RunState = {
    id: nanoid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userInput: input,
    iterations: [],
    currentIteration: 0,
    bestIteration: 0,
    bestCoverage: 0,
    status: 'running',
  };

  let currentTopic: CustomTopic | null = null;
  let topicId: string | null = null;

  for (let i = 1; i <= maxIterations; i++) {
    const iterationStart = Date.now();
    runState.currentIteration = i;

    yield { type: 'iteration:start', iteration: i };

    // Step 1: Generate or improve topic
    if (i === 1) {
      currentTopic = await deps.llm.generateTopic(
        input.topicDescription,
        input.intent,
        input.seedExamples,
      );
    } else {
      const prevIteration = runState.iterations[runState.iterations.length - 1];
      currentTopic = await deps.llm.improveTopic(
        currentTopic!,
        prevIteration.metrics,
        prevIteration.analysis,
        prevIteration.testResults,
        i,
        targetCoverage,
      );
    }

    yield { type: 'generate:complete', topic: currentTopic };

    // Step 2: Apply topic via management API
    if (i === 1) {
      const response = await deps.management.createTopic({
        topic_name: currentTopic.name,
        topic_description: currentTopic.description,
        topic_examples: currentTopic.examples,
      });
      topicId = response.topic_id;

      await deps.management.assignTopicToProfile({
        profileName: input.profileName,
        topicId: topicId,
        action: input.intent,
      });
    } else {
      await deps.management.updateTopic(topicId!, {
        topic_name: currentTopic.name,
        topic_description: currentTopic.description,
        topic_examples: currentTopic.examples,
      });
    }

    yield { type: 'apply:complete', topicId: topicId! };

    // Wait for propagation
    if (propagationDelay > 0) {
      await delay(propagationDelay);
    }

    // Step 3: Generate test cases
    const { positiveTests, negativeTests } = await deps.llm.generateTests(
      currentTopic,
      input.intent,
    );
    const allTests = [...positiveTests, ...negativeTests];

    // Step 4: Run scans
    const testResults: TestResult[] = [];
    const prompts = allTests.map((t) => t.prompt);
    const scanResults = await deps.scanner.scanBatch(input.profileName, prompts);

    for (let j = 0; j < allTests.length; j++) {
      const testCase = allTests[j];
      const scanResult = scanResults[j];
      testResults.push({
        testCase,
        actualTriggered: scanResult.triggered,
        scanAction: scanResult.action,
        scanId: scanResult.scanId,
        reportId: scanResult.reportId,
        correct: testCase.expectedTriggered === scanResult.triggered,
      });

      yield { type: 'test:progress', completed: j + 1, total: allTests.length };
    }

    // Step 5: Evaluate
    const metrics = computeMetrics(testResults);
    yield { type: 'evaluate:complete', metrics };

    // Step 6: Analyze
    const analysis = await deps.llm.analyzeResults(currentTopic, testResults, metrics);
    yield { type: 'analyze:complete', analysis };

    // Record iteration
    const iterationResult: IterationResult = {
      iteration: i,
      timestamp: new Date().toISOString(),
      topic: currentTopic,
      testCases: allTests,
      testResults,
      metrics,
      analysis,
      durationMs: Date.now() - iterationStart,
    };

    runState.iterations.push(iterationResult);

    if (metrics.coverage > runState.bestCoverage) {
      runState.bestCoverage = metrics.coverage;
      runState.bestIteration = i;
    }

    runState.updatedAt = new Date().toISOString();

    yield { type: 'iteration:complete', result: iterationResult };

    // Check stop condition
    if (metrics.coverage >= targetCoverage) {
      break;
    }
  }

  runState.status = 'completed';

  const bestResult = runState.iterations[runState.bestIteration - 1] ?? runState.iterations[runState.iterations.length - 1];

  yield { type: 'loop:complete', bestResult, runState };
}
