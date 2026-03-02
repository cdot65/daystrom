import type { CustomTopic, TestCase, AnalysisReport } from '../../src/core/types.js';
import type { ScanResult, ManagementClient, ScanService, CustomTopicCreateRequest, CustomTopicResponse, ProfileTopicAssignment } from '../../src/airs/types.js';

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

export function createMockManagementClient(): ManagementClient {
  let topicCounter = 0;
  return {
    createTopic: async (topic: CustomTopicCreateRequest): Promise<CustomTopicResponse> => ({
      topic_id: `topic-${++topicCounter}`,
      topic_name: topic.topic_name,
      topic_description: topic.topic_description,
      topic_examples: topic.topic_examples,
    }),
    updateTopic: async (id: string, topic: CustomTopicCreateRequest): Promise<CustomTopicResponse> => ({
      topic_id: id,
      topic_name: topic.topic_name,
      topic_description: topic.topic_description,
      topic_examples: topic.topic_examples,
    }),
    deleteTopic: async () => {},
    getTopic: async (id: string): Promise<CustomTopicResponse> => ({
      topic_id: id,
      topic_name: 'Test',
      topic_description: 'Test',
      topic_examples: [],
    }),
    listTopics: async () => [],
    assignTopicToProfile: async () => {},
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
    scanBatch: async (profile: string, prompts: string[], concurrency = 5): Promise<ScanResult[]> => {
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
