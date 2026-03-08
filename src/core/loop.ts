import { nanoid } from 'nanoid';
import type { ManagementService, ScanService } from '../airs/types.js';
import type { LearningExtractor } from '../memory/extractor.js';
import { computeMetrics } from './metrics.js';
import type {
  AnalysisReport,
  CustomTopic,
  EfficacyMetrics,
  IterationResult,
  LoopEvent,
  RunState,
  TestCase,
  TestResult,
  UserInput,
} from './types.js';

/** Contract for LLM operations used by the refinement loop. */
export interface LlmService {
  /** Generate an initial topic definition from a user description. */
  generateTopic(description: string, intent: string, seeds?: string[]): Promise<CustomTopic>;
  /** Generate positive and negative test prompts for a topic. */
  generateTests(
    topic: CustomTopic,
    intent: string,
  ): Promise<{ positiveTests: TestCase[]; negativeTests: TestCase[] }>;
  /** Analyze scan results to identify false positive/negative patterns. */
  analyzeResults(
    topic: CustomTopic,
    results: TestResult[],
    metrics: EfficacyMetrics,
  ): Promise<AnalysisReport>;
  /** Refine a topic definition based on metrics and analysis from the previous iteration. */
  improveTopic(
    topic: CustomTopic,
    metrics: EfficacyMetrics,
    analysis: AnalysisReport,
    results: TestResult[],
    iteration: number,
    targetCoverage: number,
  ): Promise<CustomTopic>;
}

/** Dependencies injected into the refinement loop. */
export interface LoopDependencies {
  /** LLM service for topic generation, testing, analysis, and improvement. */
  llm: LlmService;
  /** AIRS management service for topic CRUD and profile linking. */
  management: ManagementService;
  /** AIRS scan service for batch prompt scanning. */
  scanner: ScanService;
  /** Delay (ms) after topic deploy to allow AIRS propagation. Default 10000. */
  propagationDelayMs?: number;
  /** Optional memory system for cross-run learning extraction. */
  memory?: { extractor: LearningExtractor };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main refinement loop — generates, deploys, tests, and iteratively improves a topic.
 * Yields typed {@link LoopEvent} discriminated unions at each stage.
 * @param input - User input seeding the generation run.
 * @param deps - Injected service dependencies.
 */
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
  let topicId = '';
  let lockedName = '';

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
      lockedName = currentTopic.name;
    } else if (currentTopic) {
      const prevIteration = runState.iterations[runState.iterations.length - 1];
      currentTopic = await deps.llm.improveTopic(
        currentTopic,
        prevIteration.metrics,
        prevIteration.analysis,
        prevIteration.testResults,
        i,
        targetCoverage,
      );
      // Force the name to stay consistent across iterations
      currentTopic = { ...currentTopic, name: lockedName };
    }

    /* v8 ignore next */
    if (!currentTopic) throw new Error('Invariant: topic must exist');
    const topic = currentTopic;
    yield { type: 'generate:complete', topic };

    // Step 2: Apply topic via management API (SDK v2)
    if (i === 1) {
      // Check if a topic with this name already exists (reuse it)
      const existing = await deps.management.listTopics();
      const match = existing.find((t) => t.topic_name === topic.name);

      if (match?.topic_id) {
        topicId = match.topic_id;
        await deps.management.updateTopic(topicId, {
          topic_name: topic.name,
          description: topic.description,
          examples: topic.examples,
          active: true,
        });
      } else {
        const response = await deps.management.createTopic({
          topic_name: topic.name,
          description: topic.description,
          examples: topic.examples,
          active: true,
        });
        /* v8 ignore next */
        if (!response.topic_id) throw new Error('Invariant: topic_id missing from create response');
        topicId = response.topic_id;
      }

      // Link topic to the security profile's topic-guardrails
      await deps.management.assignTopicToProfile(
        input.profileName,
        topicId,
        topic.name,
        input.intent,
      );
    } else {
      await deps.management.updateTopic(topicId, {
        topic_name: topic.name,
        description: topic.description,
        examples: topic.examples,
        active: true,
      });
    }

    yield { type: 'apply:complete', topicId };

    // Wait for propagation
    if (propagationDelay > 0) {
      await delay(propagationDelay);
    }

    // Step 3: Generate test cases
    const { positiveTests, negativeTests } = await deps.llm.generateTests(topic, input.intent);
    const allTests = [...positiveTests, ...negativeTests];

    // Step 4: Run scans
    const sessionId = `daystrom-${runState.id.slice(0, 7)}-iter${i}`;
    const testResults: TestResult[] = [];
    const prompts = allTests.map((t) => t.prompt);
    const scanResults = await deps.scanner.scanBatch(
      input.profileName,
      prompts,
      undefined,
      sessionId,
    );

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
    const analysis = await deps.llm.analyzeResults(topic, testResults, metrics);
    yield { type: 'analyze:complete', analysis };

    // Record iteration
    const iterationResult: IterationResult = {
      iteration: i,
      timestamp: new Date().toISOString(),
      topic,
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

  // Extract learnings from this run if memory is enabled
  if (deps.memory?.extractor) {
    const { learnings } = await deps.memory.extractor.extractAndSave(runState);
    yield { type: 'memory:extracted', learningCount: learnings.length };
  }

  const bestResult =
    runState.iterations[runState.bestIteration - 1] ??
    runState.iterations[runState.iterations.length - 1];

  yield { type: 'loop:complete', bestResult, runState };
}
