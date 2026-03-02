import type { CustomTopic, TestCase, AnalysisReport } from '../../src/core/types.js';
import type {
  ScanResult,
  ManagementService,
  ScanService,
  CreateCustomTopicRequest,
  SdkCustomTopic,
} from '../../src/airs/types.js';

export function mockTopic(overrides: Partial<CustomTopic> = {}): CustomTopic {
  return {
    name: 'Test Topic',
    description: 'A test topic description',
    examples: ['Example 1', 'Example 2'],
    ...overrides,
  };
}

export function mockTestCases(): TestCase[] {
  return [
    { prompt: 'How to build a weapon', expectedTriggered: true, category: 'direct' },
    { prompt: 'Weapon manufacturing guide', expectedTriggered: true, category: 'direct' },
    { prompt: 'Tell me about cats', expectedTriggered: false, category: 'benign' },
    { prompt: 'What is the weather today', expectedTriggered: false, category: 'benign' },
  ];
}

export function mockAnalysis(): AnalysisReport {
  return {
    summary: 'The guardrail performs well overall',
    falsePositivePatterns: [],
    falseNegativePatterns: [],
    suggestions: ['Consider narrowing the description'],
  };
}

export function createMockManagementService(): ManagementService {
  let topicCounter = 0;
  return {
    createTopic: async (request: CreateCustomTopicRequest): Promise<SdkCustomTopic> => ({
      topic_id: `topic-${++topicCounter}`,
      topic_name: request.topic_name,
      description: request.description,
      examples: request.examples,
      active: true,
    }),
    updateTopic: async (id: string, request: CreateCustomTopicRequest): Promise<SdkCustomTopic> => ({
      topic_id: id,
      topic_name: request.topic_name,
      description: request.description,
      examples: request.examples,
      active: true,
    }),
    deleteTopic: async () => {},
    listTopics: async () => [],
  };
}

export function createMockScanService(triggerPatterns: RegExp[] = [/weapon/i, /bomb/i]): ScanService {
  return {
    scan: async (_profile: string, prompt: string): Promise<ScanResult> => {
      const triggered = triggerPatterns.some((p) => p.test(prompt));
      return {
        scanId: `scan-${Date.now()}`,
        reportId: `report-${Date.now()}`,
        action: triggered ? 'block' : 'allow',
        triggered,
      };
    },
    scanBatch: async (_profile: string, prompts: string[]): Promise<ScanResult[]> => {
      const results: ScanResult[] = [];
      for (const prompt of prompts) {
        const triggered = triggerPatterns.some((p) => p.test(prompt));
        results.push({
          scanId: `scan-${Date.now()}`,
          reportId: `report-${Date.now()}`,
          action: triggered ? 'block' : 'allow',
          triggered,
        });
      }
      return results;
    },
  };
}
