import type {
  CreateCustomTopicRequest,
  ManagementService,
  PromptSetService,
  ScanResult,
  ScanService,
  SdkCustomTopic,
} from '../../src/airs/types.js';
import type { AnalysisReport, CustomTopic, TestCase } from '../../src/core/types.js';

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
    updateTopic: async (
      id: string,
      request: CreateCustomTopicRequest,
    ): Promise<SdkCustomTopic> => ({
      topic_id: id,
      topic_name: request.topic_name,
      description: request.description,
      examples: request.examples,
      active: true,
    }),
    deleteTopic: async () => {},
    listTopics: async () => [],
    assignTopicToProfile: async () => {},
  };
}

export function createMockScanService(
  triggerPatterns: RegExp[] = [/weapon/i, /bomb/i],
): ScanService {
  return {
    scan: async (_profile: string, prompt: string, _sessionId?: string): Promise<ScanResult> => {
      const triggered = triggerPatterns.some((p) => p.test(prompt));
      return {
        scanId: `scan-${Date.now()}`,
        reportId: `report-${Date.now()}`,
        action: triggered ? 'block' : 'allow',
        triggered,
        category: triggered ? 'malicious' : 'benign',
      };
    },
    scanBatch: async (
      _profile: string,
      prompts: string[],
      _concurrency?: number,
      _sessionId?: string,
    ): Promise<ScanResult[]> => {
      const results: ScanResult[] = [];
      for (const prompt of prompts) {
        const triggered = triggerPatterns.some((p) => p.test(prompt));
        results.push({
          scanId: `scan-${Date.now()}`,
          reportId: `report-${Date.now()}`,
          action: triggered ? 'block' : 'allow',
          triggered,
          category: triggered ? 'malicious' : 'benign',
        });
      }
      return results;
    },
  };
}

/**
 * Mock scanner simulating AIRS allow-intent behavior.
 * Matching prompts → category: 'benign' (content matched the allow topic).
 * Non-matching prompts → category: 'malicious' (content not in allowed set).
 * triggered is always false for allow topics; action is always 'allow'.
 */
export function createMockAllowScanService(allowPatterns: RegExp[] = []): ScanService {
  return {
    scan: async (_profile: string, prompt: string, _sessionId?: string): Promise<ScanResult> => {
      const matches = allowPatterns.some((p) => p.test(prompt));
      return {
        scanId: `scan-${Date.now()}`,
        reportId: `report-${Date.now()}`,
        action: 'allow',
        triggered: false, // AIRS never sets topic_violation for allow-intent topics
        category: matches ? 'benign' : 'malicious',
      };
    },
    scanBatch: async (
      _profile: string,
      prompts: string[],
      _concurrency?: number,
      _sessionId?: string,
    ): Promise<ScanResult[]> => {
      const results: ScanResult[] = [];
      for (const prompt of prompts) {
        const matches = allowPatterns.some((p) => p.test(prompt));
        results.push({
          scanId: `scan-${Date.now()}`,
          reportId: `report-${Date.now()}`,
          action: 'allow',
          triggered: false,
          category: matches ? 'benign' : 'malicious',
        });
      }
      return results;
    },
  };
}

export function createMockPromptSetService(): PromptSetService {
  let promptSetCounter = 0;
  let promptCounter = 0;
  return {
    createPromptSet: async (name: string) => ({
      uuid: `ps-${++promptSetCounter}`,
      name,
    }),
    addPrompt: async (_setId: string, prompt: string) => ({
      uuid: `prompt-${++promptCounter}`,
      prompt,
    }),
    listPromptSets: async () => [],
  };
}
