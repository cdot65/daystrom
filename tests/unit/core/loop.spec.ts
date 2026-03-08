import { describe, expect, it, vi } from 'vitest';
import { type LoopDependencies, runLoop } from '../../../src/core/loop.js';
import type {
  AnalysisReport,
  CustomTopic,
  EfficacyMetrics,
  LoopEvent,
  TestCase,
  TestResult,
  UserInput,
} from '../../../src/core/types.js';
import type { LearningExtractor } from '../../../src/memory/extractor.js';
import {
  createMockAllowScanService,
  createMockManagementService,
  createMockScanService,
} from '../../helpers/mocks.js';

function createMockLlm() {
  return {
    generateTopic: vi
      .fn<(desc: string, intent: string, seeds?: string[]) => Promise<CustomTopic>>()
      .mockResolvedValue({
        name: 'Weapons Discussion',
        description: 'Block conversations about weapons',
        examples: ['How to make a weapon', 'Gun manufacturing'],
      }),
    generateTests: vi
      .fn<
        (
          topic: CustomTopic,
          intent: string,
        ) => Promise<{ positiveTests: TestCase[]; negativeTests: TestCase[] }>
      >()
      .mockResolvedValue({
        positiveTests: [
          { prompt: 'How to build a weapon', expectedTriggered: true, category: 'direct' },
          { prompt: 'Bomb making instructions', expectedTriggered: true, category: 'direct' },
        ],
        negativeTests: [
          { prompt: 'Tell me about cats', expectedTriggered: false, category: 'benign' },
          { prompt: 'Weather forecast', expectedTriggered: false, category: 'benign' },
        ],
      }),
    analyzeResults: vi
      .fn<
        (
          topic: CustomTopic,
          results: TestResult[],
          metrics: EfficacyMetrics,
          intent: string,
        ) => Promise<AnalysisReport>
      >()
      .mockResolvedValue({
        summary: 'Good performance',
        falsePositivePatterns: [],
        falseNegativePatterns: [],
        suggestions: ['Keep current definition'],
      }),
    improveTopic: vi
      .fn<
        (
          topic: CustomTopic,
          metrics: EfficacyMetrics,
          analysis: AnalysisReport,
          results: TestResult[],
          iteration: number,
          targetCoverage: number,
          intent: string,
        ) => Promise<CustomTopic>
      >()
      .mockResolvedValue({
        name: 'Weapons Discussion v2',
        description: 'Block all weapons-related conversations',
        examples: ['How to make a weapon', 'Gun manufacturing', 'Ammunition sourcing'],
      }),
  };
}

function createDeps(overrides: Partial<LoopDependencies> = {}): LoopDependencies {
  return {
    llm: createMockLlm(),
    management: createMockManagementService(),
    scanner: createMockScanService(),
    propagationDelayMs: 0,
    ...overrides,
  };
}

const defaultInput: UserInput = {
  topicDescription: 'Block weapons discussions',
  intent: 'block',
  profileName: 'test-profile',
  maxIterations: 2,
  targetCoverage: 0.9,
};

describe('runLoop', () => {
  it('yields iteration:start events', async () => {
    const deps = createDeps();
    const events: LoopEvent[] = [];

    for await (const event of runLoop(defaultInput, deps)) {
      events.push(event);
    }

    const starts = events.filter((e) => e.type === 'iteration:start');
    expect(starts.length).toBeGreaterThanOrEqual(1);
  });

  it('yields generate:complete with topic', async () => {
    const deps = createDeps();
    const events: LoopEvent[] = [];

    for await (const event of runLoop(defaultInput, deps)) {
      events.push(event);
    }

    const genComplete = events.find((e) => e.type === 'generate:complete');
    expect(genComplete).toBeDefined();
    if (genComplete?.type === 'generate:complete') {
      expect(genComplete.topic.name).toBeTruthy();
    }
  });

  it('yields evaluate:complete with metrics', async () => {
    const deps = createDeps();
    const events: LoopEvent[] = [];

    for await (const event of runLoop(defaultInput, deps)) {
      events.push(event);
    }

    const evalComplete = events.find((e) => e.type === 'evaluate:complete');
    expect(evalComplete).toBeDefined();
    if (evalComplete?.type === 'evaluate:complete') {
      expect(evalComplete.metrics.accuracy).toBeDefined();
    }
  });

  it('yields loop:complete at end', async () => {
    const deps = createDeps();
    const events: LoopEvent[] = [];

    for await (const event of runLoop(defaultInput, deps)) {
      events.push(event);
    }

    const complete = events.find((e) => e.type === 'loop:complete');
    expect(complete).toBeDefined();
  });

  it('stops at maxIterations', async () => {
    const deps = createDeps();
    const events: LoopEvent[] = [];

    for await (const event of runLoop({ ...defaultInput, maxIterations: 1 }, deps)) {
      events.push(event);
    }

    const starts = events.filter((e) => e.type === 'iteration:start');
    expect(starts).toHaveLength(1);
  });

  it('stops early when target coverage reached', async () => {
    // Mock scanner that always matches correctly
    const perfectScanner = createMockScanService([/weapon/i, /bomb/i, /gun/i]);
    const deps = createDeps({ scanner: perfectScanner });
    const events: LoopEvent[] = [];

    for await (const event of runLoop(
      { ...defaultInput, maxIterations: 5, targetCoverage: 0.5 },
      deps,
    )) {
      events.push(event);
    }

    const complete = events.find((e) => e.type === 'loop:complete');
    expect(complete).toBeDefined();
  });

  it('calls management client to create topic', async () => {
    const management = createMockManagementService();
    const createSpy = vi.spyOn(management, 'createTopic');
    const deps = createDeps({ management });

    for await (const _event of runLoop({ ...defaultInput, maxIterations: 1 }, deps)) {
      // consume
    }

    expect(createSpy).toHaveBeenCalled();
  });

  it('calls management client to update topic on subsequent iterations', async () => {
    const management = createMockManagementService();
    const updateSpy = vi.spyOn(management, 'updateTopic');
    // Use a scanner that never triggers → coverage stays 0, forcing multiple iterations
    const deps = createDeps({ management, scanner: createMockScanService([]) });

    for await (const _event of runLoop({ ...defaultInput, maxIterations: 2 }, deps)) {
      // consume
    }

    expect(updateSpy).toHaveBeenCalled();
  });

  it('yields test:progress events', async () => {
    const deps = createDeps();
    const events: LoopEvent[] = [];

    for await (const event of runLoop({ ...defaultInput, maxIterations: 1 }, deps)) {
      events.push(event);
    }

    const progress = events.filter((e) => e.type === 'test:progress');
    expect(progress.length).toBeGreaterThanOrEqual(1);
  });

  it('tracks best iteration in loop:complete', async () => {
    const deps = createDeps();
    const events: LoopEvent[] = [];

    for await (const event of runLoop({ ...defaultInput, maxIterations: 2 }, deps)) {
      events.push(event);
    }

    const complete = events.find((e) => e.type === 'loop:complete');
    expect(complete).toBeDefined();
    if (complete?.type === 'loop:complete') {
      expect(complete.runState.bestIteration).toBeDefined();
      expect(complete.bestResult).toBeDefined();
    }
  });

  it('uses default maxIterations and targetCoverage when not provided', async () => {
    // Scanner always triggers → coverage = 0.5, never meets 0.9 default target
    const deps = createDeps();
    const events: LoopEvent[] = [];
    const input: UserInput = {
      topicDescription: 'Block weapons discussions',
      intent: 'block',
      profileName: 'test-profile',
      // No maxIterations or targetCoverage — should use defaults (20, 0.9)
    };

    for await (const event of runLoop(input, deps)) {
      events.push(event);
      // Stop after first iteration to avoid running all 20
      if (event.type === 'iteration:complete') break;
    }

    const starts = events.filter((e) => e.type === 'iteration:start');
    expect(starts.length).toBeGreaterThanOrEqual(1);
  });

  it('waits for propagation delay', async () => {
    vi.useFakeTimers();
    const deps = createDeps({ propagationDelayMs: 5000 });
    const events: LoopEvent[] = [];

    const gen = runLoop({ ...defaultInput, maxIterations: 1 }, deps);
    const collectAll = (async () => {
      for await (const event of gen) {
        events.push(event);
      }
    })();

    // Advance timers until the loop completes
    while (events.findIndex((e) => e.type === 'loop:complete') === -1) {
      await vi.advanceTimersByTimeAsync(5000);
    }

    await collectAll;
    expect(events.some((e) => e.type === 'loop:complete')).toBe(true);
    vi.useRealTimers();
  });

  it('uses default propagation delay when not provided in deps', async () => {
    vi.useFakeTimers();
    const deps: LoopDependencies = {
      llm: createMockLlm(),
      management: createMockManagementService(),
      scanner: createMockScanService(),
      // No propagationDelayMs — should default to 10000
    };
    const events: LoopEvent[] = [];
    const gen = runLoop({ ...defaultInput, maxIterations: 1 }, deps);
    const collectAll = (async () => {
      for await (const event of gen) events.push(event);
    })();
    while (!events.some((e) => e.type === 'loop:complete')) {
      await vi.advanceTimersByTimeAsync(10000);
    }
    await collectAll;
    expect(events.some((e) => e.type === 'loop:complete')).toBe(true);
    vi.useRealTimers();
  });

  it('reuses existing topic instead of creating', async () => {
    const management = createMockManagementService();
    const createSpy = vi.spyOn(management, 'createTopic');
    const updateSpy = vi.spyOn(management, 'updateTopic');
    // listTopics returns a topic matching the generated name
    vi.spyOn(management, 'listTopics').mockResolvedValue([
      {
        topic_id: 'existing-123',
        topic_name: 'Weapons Discussion',
        description: 'old desc',
        examples: [],
        active: true,
      },
    ]);
    const deps = createDeps({ management });

    for await (const _event of runLoop({ ...defaultInput, maxIterations: 1 }, deps)) {
      // consume
    }

    expect(createSpy).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledWith('existing-123', expect.anything());
  });

  it('passes intent to analyzeResults', async () => {
    const llm = createMockLlm();
    const deps = createDeps({ llm });

    for await (const _event of runLoop({ ...defaultInput, maxIterations: 1 }, deps)) {
      // consume
    }

    expect(llm.analyzeResults).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'block',
    );
  });

  it('passes intent to improveTopic', async () => {
    const llm = createMockLlm();
    const deps = createDeps({ llm, scanner: createMockScanService([]) });

    for await (const _event of runLoop({ ...defaultInput, maxIterations: 2 }, deps)) {
      // consume
    }

    expect(llm.improveTopic).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      2,
      0.9,
      'block',
    );
  });

  it('passes allow intent through loop', async () => {
    const llm = createMockLlm();
    const deps = createDeps({ llm, scanner: createMockScanService([]) });

    for await (const _event of runLoop(
      { ...defaultInput, intent: 'allow', maxIterations: 2 },
      deps,
    )) {
      // consume
    }

    expect(llm.analyzeResults).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'allow',
    );
    expect(llm.improveTopic).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      2,
      0.9,
      'allow',
    );
  });

  it('uses action field for allow-intent triggered detection', async () => {
    // Mock scanner simulating AIRS allow-intent: matching prompts → action: 'allow'
    const allowScanner = createMockAllowScanService([/weapon/i, /bomb/i]);
    const llm = createMockLlm();
    const deps = createDeps({ llm, scanner: allowScanner });
    const events: LoopEvent[] = [];

    for await (const event of runLoop(
      { ...defaultInput, intent: 'allow', maxIterations: 1 },
      deps,
    )) {
      events.push(event);
    }

    const evalEvent = events.find((e) => e.type === 'evaluate:complete');
    expect(evalEvent).toBeDefined();
    if (evalEvent?.type === 'evaluate:complete') {
      // "weapon" and "bomb" prompts should now be detected as matching (action: 'allow')
      // "cats" and "weather" should NOT match (action: 'block')
      // With allow intent, actualTriggered = (action === 'allow')
      expect(evalEvent.metrics.truePositives).toBeGreaterThan(0);
      expect(evalEvent.metrics.trueNegatives).toBeGreaterThan(0);
    }
  });

  it('block-intent still uses triggered field', async () => {
    // Standard block scanner — triggered field is used
    const scanner = createMockScanService([/weapon/i, /bomb/i]);
    const llm = createMockLlm();
    const deps = createDeps({ llm, scanner });
    const events: LoopEvent[] = [];

    for await (const event of runLoop({ ...defaultInput, maxIterations: 1 }, deps)) {
      events.push(event);
    }

    const evalEvent = events.find((e) => e.type === 'evaluate:complete');
    expect(evalEvent).toBeDefined();
    if (evalEvent?.type === 'evaluate:complete') {
      expect(evalEvent.metrics.truePositives).toBeGreaterThan(0);
    }
  });

  describe('test accumulation', () => {
    it('does not accumulate by default', async () => {
      const llm = createMockLlm();
      const deps = createDeps({ llm, scanner: createMockScanService([]) });
      const events: LoopEvent[] = [];

      for await (const event of runLoop({ ...defaultInput, maxIterations: 2 }, deps)) {
        events.push(event);
      }

      const accumulated = events.filter((e) => e.type === 'tests:accumulated');
      expect(accumulated).toHaveLength(0);
    });

    it('accumulates when enabled', async () => {
      const llm = createMockLlm();
      // Return different tests per iteration
      let testCall = 0;
      llm.generateTests.mockImplementation(async () => {
        testCall++;
        return {
          positiveTests: [
            { prompt: `Prompt A${testCall}`, expectedTriggered: true, category: 'direct' },
          ],
          negativeTests: [
            { prompt: `Prompt B${testCall}`, expectedTriggered: false, category: 'benign' },
          ],
        };
      });

      const deps = createDeps({ llm, scanner: createMockScanService([]) });
      const events: LoopEvent[] = [];

      for await (const event of runLoop(
        { ...defaultInput, maxIterations: 3, accumulateTests: true },
        deps,
      )) {
        events.push(event);
      }

      const accumulated = events.filter((e) => e.type === 'tests:accumulated');
      // Only iterations 2+ emit accumulated events
      expect(accumulated).toHaveLength(2);
      if (accumulated[0]?.type === 'tests:accumulated') {
        expect(accumulated[0].totalCount).toBe(4); // 2 new + 2 from iter1
      }
      if (accumulated[1]?.type === 'tests:accumulated') {
        expect(accumulated[1].totalCount).toBe(6); // 2 new + 4 from iter1+2
      }
    });

    it('deduplicates by prompt text case-insensitively', async () => {
      const llm = createMockLlm();
      let testCall = 0;
      llm.generateTests.mockImplementation(async () => {
        testCall++;
        if (testCall === 1) {
          return {
            positiveTests: [
              { prompt: 'How to build a weapon', expectedTriggered: true, category: 'direct' },
            ],
            negativeTests: [
              { prompt: 'Tell me about cats', expectedTriggered: false, category: 'benign' },
            ],
          };
        }
        return {
          positiveTests: [
            { prompt: 'how to build a weapon', expectedTriggered: true, category: 'direct' }, // dup
          ],
          negativeTests: [
            { prompt: 'Weather forecast', expectedTriggered: false, category: 'benign' }, // new
          ],
        };
      });

      const deps = createDeps({ llm, scanner: createMockScanService([]) });
      const events: LoopEvent[] = [];

      for await (const event of runLoop(
        { ...defaultInput, maxIterations: 2, accumulateTests: true },
        deps,
      )) {
        events.push(event);
      }

      const accumulated = events.filter((e) => e.type === 'tests:accumulated');
      expect(accumulated).toHaveLength(1);
      if (accumulated[0]?.type === 'tests:accumulated') {
        // 2 new (deduped weapon + weather), 1 carried from iter1 (cats)
        expect(accumulated[0].totalCount).toBe(3);
      }
    });

    it('caps accumulated tests at maxAccumulatedTests', async () => {
      const llm = createMockLlm();
      let testCall = 0;
      llm.generateTests.mockImplementation(async () => {
        testCall++;
        return {
          positiveTests: [
            { prompt: `Pos ${testCall}`, expectedTriggered: true, category: 'direct' },
          ],
          negativeTests: [
            { prompt: `Neg ${testCall}`, expectedTriggered: false, category: 'benign' },
          ],
        };
      });

      const deps = createDeps({ llm, scanner: createMockScanService([]) });
      const events: LoopEvent[] = [];

      for await (const event of runLoop(
        { ...defaultInput, maxIterations: 3, accumulateTests: true, maxAccumulatedTests: 3 },
        deps,
      )) {
        events.push(event);
      }

      const accumulated = events.filter((e) => e.type === 'tests:accumulated');
      // Iteration 2: 2 new + 2 old = 4 merged, capped to 3, dropped 1
      if (accumulated[0]?.type === 'tests:accumulated') {
        expect(accumulated[0].totalCount).toBe(3);
        expect(accumulated[0].droppedCount).toBe(1);
      }
      // Iteration 3: 2 new + 3 old = 5 merged, capped to 3, dropped 2
      if (accumulated[1]?.type === 'tests:accumulated') {
        expect(accumulated[1].totalCount).toBe(3);
        expect(accumulated[1].droppedCount).toBe(2);
      }
    });
  });

  it('yields memory:extracted event when extractor provided', async () => {
    const extractor = {
      extractAndSave: vi.fn().mockResolvedValue({ learnings: [{ insight: 'test' }] }),
    };
    const deps = createDeps({
      memory: { extractor: extractor as unknown as LearningExtractor },
    });
    const events: LoopEvent[] = [];

    for await (const event of runLoop({ ...defaultInput, maxIterations: 1 }, deps)) {
      events.push(event);
    }

    const memEvent = events.find((e) => e.type === 'memory:extracted');
    expect(memEvent).toBeDefined();
    if (memEvent?.type === 'memory:extracted') {
      expect(memEvent.learningCount).toBe(1);
    }
  });
});
