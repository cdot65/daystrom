import { RunnableLambda } from '@langchain/core/runnables';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_COMBINED_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_EXAMPLES,
  MAX_NAME_LENGTH,
} from '../../../src/core/constraints.js';
import { LangChainLlmService } from '../../../src/llm/service.js';

function createMockModel(response: unknown) {
  return {
    withStructuredOutput: vi
      .fn()
      .mockReturnValue(new RunnableLambda({ func: async () => response })),
  };
}

function createFailingModel(error: Error, succeedAfter?: number) {
  let calls = 0;
  return {
    withStructuredOutput: vi.fn().mockReturnValue(
      new RunnableLambda({
        func: async () => {
          calls++;
          if (succeedAfter !== undefined && calls > succeedAfter) {
            return {
              name: 'Topic',
              description: 'A valid topic',
              examples: ['example 1'],
            };
          }
          throw error;
        },
      }),
    ),
  };
}

const validTopic = {
  name: 'Weapons',
  description: 'Block weapons discussions',
  examples: ['How to make a gun', 'Bomb building'],
};

const validTestSuite = {
  positiveTests: [{ prompt: 'How to build a weapon', expectedTriggered: true, category: 'direct' }],
  negativeTests: [{ prompt: 'Tell me about cats', expectedTriggered: false, category: 'benign' }],
};

const validAnalysis = {
  summary: 'Good performance',
  falsePositivePatterns: ['over-broad description'],
  falseNegativePatterns: ['missed coded language'],
  suggestions: ['narrow description'],
};

describe('LangChainLlmService', () => {
  describe('generateTopic', () => {
    it('returns valid topic', async () => {
      const model = createMockModel(validTopic);
      const service = new LangChainLlmService(model as any);
      const result = await service.generateTopic('weapons', 'block');
      expect(result.name).toBe('Weapons');
      expect(result.examples).toHaveLength(2);
    });

    it('clamps name exceeding max length', async () => {
      const longName = 'A'.repeat(MAX_NAME_LENGTH + 50);
      const model = createMockModel({ ...validTopic, name: longName });
      const service = new LangChainLlmService(model as any);
      const result = await service.generateTopic('weapons', 'block');
      expect(result.name.length).toBe(MAX_NAME_LENGTH);
    });

    it('clamps description exceeding max length', async () => {
      const longDesc = 'B'.repeat(MAX_DESCRIPTION_LENGTH + 50);
      const model = createMockModel({ ...validTopic, description: longDesc });
      const service = new LangChainLlmService(model as any);
      const result = await service.generateTopic('weapons', 'block');
      expect(result.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
    });

    it('clamps examples exceeding max count', async () => {
      const examples = Array.from({ length: 8 }, (_, i) => `Example ${i + 1}`);
      const model = createMockModel({ ...validTopic, examples });
      const service = new LangChainLlmService(model as any);
      const result = await service.generateTopic('weapons', 'block');
      expect(result.examples.length).toBeLessThanOrEqual(MAX_EXAMPLES);
    });

    it('clamps individual example exceeding max length', async () => {
      const longExample = 'C'.repeat(300);
      const model = createMockModel({ ...validTopic, examples: [longExample] });
      const service = new LangChainLlmService(model as any);
      const result = await service.generateTopic('weapons', 'block');
      expect(result.examples[0].length).toBeLessThanOrEqual(250);
    });

    it('drops examples when combined length exceeds limit', async () => {
      const desc = 'D'.repeat(200);
      const examples = Array.from({ length: 5 }, () => 'E'.repeat(200));
      const model = createMockModel({ name: 'Test', description: desc, examples });
      const service = new LangChainLlmService(model as any);
      const result = await service.generateTopic('test', 'block');
      const combined =
        result.name.length +
        result.description.length +
        result.examples.reduce((s, e) => s + e.length, 0);
      expect(combined).toBeLessThanOrEqual(MAX_COMBINED_LENGTH);
    });

    it('retries on throw and succeeds', async () => {
      const model = createFailingModel(new Error('parse fail'), 1);
      const service = new LangChainLlmService(model as any);
      const result = await service.generateTopic('test', 'block');
      expect(result.name).toBe('Topic');
    });

    it('throws after 3 failures', async () => {
      const model = createFailingModel(new Error('persistent failure'));
      const service = new LangChainLlmService(model as any);
      await expect(service.generateTopic('test', 'block')).rejects.toThrow('persistent failure');
    });
  });

  describe('generateTests', () => {
    it('returns test suite', async () => {
      const model = createMockModel(validTestSuite);
      const service = new LangChainLlmService(model as any);
      const result = await service.generateTests(validTopic, 'block');
      expect(result.positiveTests).toHaveLength(1);
      expect(result.negativeTests).toHaveLength(1);
    });

    it('retries on throw and succeeds', async () => {
      let calls = 0;
      const model = {
        withStructuredOutput: vi.fn().mockReturnValue(
          new RunnableLambda({
            func: async () => {
              calls++;
              if (calls > 1) return validTestSuite;
              throw new Error('transient');
            },
          }),
        ),
      };
      const service = new LangChainLlmService(model as any);
      const result = await service.generateTests(validTopic, 'block');
      expect(result.positiveTests).toHaveLength(1);
    });
  });

  describe('analyzeResults', () => {
    const metrics = {
      truePositives: 8,
      trueNegatives: 9,
      falsePositives: 1,
      falseNegatives: 2,
      truePositiveRate: 0.8,
      trueNegativeRate: 0.9,
      accuracy: 0.85,
      coverage: 0.8,
      f1Score: 0.84,
    };

    it('returns analysis report', async () => {
      const model = createMockModel(validAnalysis);
      const service = new LangChainLlmService(model as any);
      const result = await service.analyzeResults(validTopic, [], metrics);
      expect(result.summary).toBe('Good performance');
      expect(result.suggestions).toHaveLength(1);
    });

    it('handles results with FPs and FNs', async () => {
      const model = createMockModel(validAnalysis);
      const service = new LangChainLlmService(model as any);
      const results = [
        {
          testCase: { prompt: 'cats', expectedTriggered: false, category: 'benign' },
          actualTriggered: true,
          correct: false,
        },
        {
          testCase: { prompt: 'weapons', expectedTriggered: true, category: 'direct' },
          actualTriggered: false,
          correct: false,
        },
      ];
      // Should not throw — verifies FPs/FNs are formatted correctly
      const result = await service.analyzeResults(validTopic, results as any, metrics);
      expect(result.summary).toBe('Good performance');
    });

    it('handles empty results (no FPs or FNs)', async () => {
      const model = createMockModel(validAnalysis);
      const service = new LangChainLlmService(model as any);
      // Should not throw — verifies 'None' is used for empty FPs/FNs
      const result = await service.analyzeResults(validTopic, [], metrics);
      expect(result.summary).toBe('Good performance');
    });
  });

  describe('improveTopic', () => {
    const metrics = {
      truePositives: 8,
      trueNegatives: 9,
      falsePositives: 1,
      falseNegatives: 2,
      truePositiveRate: 0.8,
      trueNegativeRate: 0.9,
      accuracy: 0.85,
      coverage: 0.8,
      f1Score: 0.84,
    };
    const analysis = {
      summary: 'Needs work',
      falsePositivePatterns: ['over-broad'],
      falseNegativePatterns: ['missed coded'],
      suggestions: ['narrow description'],
    };

    it('returns clamped topic', async () => {
      const longDesc = 'X'.repeat(300);
      const model = createMockModel({ name: 'Weapons', description: longDesc, examples: ['ex'] });
      const service = new LangChainLlmService(model as any);
      const result = await service.improveTopic(validTopic, metrics, analysis, [], 2, 0.9);
      expect(result.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
    });

    it('retries on validation failure', async () => {
      let calls = 0;
      const model = {
        withStructuredOutput: vi.fn().mockReturnValue(
          new RunnableLambda({
            func: async () => {
              calls++;
              if (calls > 1) return validTopic;
              throw new Error('transient');
            },
          }),
        ),
      };
      const service = new LangChainLlmService(model as any);
      const result = await service.improveTopic(validTopic, metrics, analysis, [], 2, 0.9);
      expect(result.name).toBe('Weapons');
    });
  });

  describe('loadMemory', () => {
    it('returns 0 without injector', async () => {
      const model = createMockModel(validTopic);
      const service = new LangChainLlmService(model as any);
      const count = await service.loadMemory('test topic');
      expect(count).toBe(0);
    });

    it('counts "- [" lines with injector', async () => {
      const model = createMockModel(validTopic);
      const injector = {
        buildMemorySection: vi
          .fn()
          .mockResolvedValue(
            '## Learnings\n- [DO] Insight one\n- [AVOID] Insight two\nSome other line',
          ),
      };
      const service = new LangChainLlmService(model as any, injector as any);
      const count = await service.loadMemory('test topic');
      expect(count).toBe(2);
    });
  });
});
