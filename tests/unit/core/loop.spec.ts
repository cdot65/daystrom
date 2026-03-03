import { describe, expect, it, vi } from 'vitest';
import { type LoopDependencies, runLoop } from '../../../src/core/loop.js';
import type {
  AnalysisReport,
  CustomTopic,
  LoopEvent,
  TestCase,
  UserInput,
} from '../../../src/core/types.js';
import { createMockManagementService, createMockScanService } from '../../helpers/mocks.js';

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
      .fn<(topic: CustomTopic, results: any, metrics: any) => Promise<AnalysisReport>>()
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
          metrics: any,
          analysis: any,
          results: any,
          iteration: number,
          targetCoverage: number,
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
});
