import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  MAX_COMBINED_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_EXAMPLE_LENGTH,
  MAX_EXAMPLES,
  MAX_NAME_LENGTH,
  validateTopic,
} from '../core/constraints.js';
import type { LlmService } from '../core/loop.js';
import type {
  AnalysisReport,
  CustomTopic,
  EfficacyMetrics,
  TestCase,
  TestResult,
} from '../core/types.js';
import type { MemoryInjector } from '../memory/injector.js';
import { analyzeResultsPrompt } from './prompts/analyze-results.js';
import { generateTestsPrompt } from './prompts/generate-tests.js';
import { buildSeedExamplesSection, generateTopicPrompt } from './prompts/generate-topic.js';
import { improveTopicPrompt } from './prompts/improve-topic.js';
import {
  type AnalysisReportOutput,
  AnalysisReportSchema,
  type CustomTopicOutput,
  CustomTopicSchema,
  type TestSuiteOutput,
  TestSuiteSchema,
} from './schemas.js';

const MAX_RETRIES = 3;

/** Clamp topic fields to fit Prisma AIRS constraints (including combined limit) */
function clampTopic(topic: CustomTopicOutput): CustomTopicOutput {
  const name = topic.name.slice(0, MAX_NAME_LENGTH);
  let description = topic.description.slice(0, MAX_DESCRIPTION_LENGTH);
  const examples = topic.examples.slice(0, MAX_EXAMPLES).map((e) => e.slice(0, MAX_EXAMPLE_LENGTH));

  // Enforce combined length limit by dropping examples from the end, then trimming description
  const combined = () =>
    name.length + description.length + examples.reduce((s, e) => s + e.length, 0);
  while (combined() > MAX_COMBINED_LENGTH && examples.length > 1) {
    examples.pop();
  }
  if (combined() > MAX_COMBINED_LENGTH) {
    const overflow = combined() - MAX_COMBINED_LENGTH;
    description = description.slice(0, description.length - overflow);
  }

  return { name, description, examples };
}

export class LangChainLlmService implements LlmService {
  private memorySection = '';

  constructor(
    private model: BaseChatModel,
    private memoryInjector?: MemoryInjector,
  ) {}

  async loadMemory(topicDescription: string): Promise<number> {
    if (!this.memoryInjector) return 0;
    this.memorySection = await this.memoryInjector.buildMemorySection(topicDescription);
    // Count lines starting with "- [" as learning count
    return this.memorySection.split('\n').filter((l) => l.startsWith('- [')).length;
  }

  async generateTopic(description: string, intent: string, seeds?: string[]): Promise<CustomTopic> {
    const structured = this.model.withStructuredOutput(CustomTopicSchema);
    const chain = generateTopicPrompt.pipe(structured);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const raw = await chain.invoke({
          topicDescription: description,
          intent,
          seedExamplesSection: buildSeedExamplesSection(seeds),
          memorySection: this.memorySection,
        });
        const result = clampTopic(raw as unknown as CustomTopicOutput);

        const errors = validateTopic(result);
        if (errors.length === 0) return result;

        if (attempt === MAX_RETRIES - 1) {
          throw new Error(
            `LLM output violates constraints after ${MAX_RETRIES} attempts: ${errors.map((e) => e.message).join(', ')}`,
          );
        }
      } catch (err) {
        if (attempt === MAX_RETRIES - 1) throw err;
      }
    }

    throw new Error('Unreachable');
  }

  async generateTests(
    topic: CustomTopic,
    intent: string,
  ): Promise<{ positiveTests: TestCase[]; negativeTests: TestCase[] }> {
    const structured = this.model.withStructuredOutput(TestSuiteSchema);
    const chain = generateTestsPrompt.pipe(structured);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const raw = await chain.invoke({
          topicName: topic.name,
          topicDescription: topic.description,
          topicExamples: topic.examples.map((e, i) => `${i + 1}. ${e}`).join('\n'),
          intent,
          memorySection: this.memorySection,
        });
        return raw as unknown as TestSuiteOutput;
      } catch (err) {
        if (attempt === MAX_RETRIES - 1) throw err;
      }
    }

    throw new Error('Unreachable');
  }

  async analyzeResults(
    topic: CustomTopic,
    results: TestResult[],
    metrics: EfficacyMetrics,
  ): Promise<AnalysisReport> {
    const structured = this.model.withStructuredOutput(AnalysisReportSchema);
    const chain = analyzeResultsPrompt.pipe(structured);

    const fps = results.filter((r) => !r.testCase.expectedTriggered && r.actualTriggered);
    const fns = results.filter((r) => r.testCase.expectedTriggered && !r.actualTriggered);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const raw = await chain.invoke({
          topicName: topic.name,
          topicDescription: topic.description,
          topicExamples: topic.examples.join(', '),
          tpr: `${(metrics.truePositiveRate * 100).toFixed(1)}%`,
          tnr: `${(metrics.trueNegativeRate * 100).toFixed(1)}%`,
          accuracy: `${(metrics.accuracy * 100).toFixed(1)}%`,
          coverage: `${(metrics.coverage * 100).toFixed(1)}%`,
          falsePositives:
            fps.length > 0
              ? fps.map((r) => `- "${r.testCase.prompt}" (${r.testCase.category})`).join('\n')
              : 'None',
          falseNegatives:
            fns.length > 0
              ? fns.map((r) => `- "${r.testCase.prompt}" (${r.testCase.category})`).join('\n')
              : 'None',
          memorySection: this.memorySection,
        });
        return raw as unknown as AnalysisReportOutput;
      } catch (err) {
        if (attempt === MAX_RETRIES - 1) throw err;
      }
    }

    throw new Error('Unreachable');
  }

  async improveTopic(
    topic: CustomTopic,
    metrics: EfficacyMetrics,
    analysis: AnalysisReport,
    results: TestResult[],
    iteration: number,
    targetCoverage: number,
  ): Promise<CustomTopic> {
    const structured = this.model.withStructuredOutput(CustomTopicSchema);
    const chain = improveTopicPrompt.pipe(structured);

    const fps = results.filter((r) => !r.testCase.expectedTriggered && r.actualTriggered);
    const fns = results.filter((r) => r.testCase.expectedTriggered && !r.actualTriggered);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const raw = await chain.invoke({
          currentName: topic.name,
          currentDescription: topic.description,
          currentExamples: topic.examples.join(', '),
          iteration,
          coverage: `${(metrics.coverage * 100).toFixed(1)}%`,
          targetCoverage: `${(targetCoverage * 100).toFixed(1)}%`,
          tpr: `${(metrics.truePositiveRate * 100).toFixed(1)}%`,
          tnr: `${(metrics.trueNegativeRate * 100).toFixed(1)}%`,
          accuracy: `${(metrics.accuracy * 100).toFixed(1)}%`,
          analysisSummary: analysis.summary,
          fpPatterns: analysis.falsePositivePatterns.join('; ') || 'None',
          fnPatterns: analysis.falseNegativePatterns.join('; ') || 'None',
          specificFPs: fps.map((r) => `- "${r.testCase.prompt}"`).join('\n') || 'None',
          specificFNs: fns.map((r) => `- "${r.testCase.prompt}"`).join('\n') || 'None',
          suggestions: analysis.suggestions.join('; '),
          memorySection: this.memorySection,
        });
        const result = clampTopic(raw as unknown as CustomTopicOutput);

        const errors = validateTopic(result);
        if (errors.length === 0) return result;

        if (attempt === MAX_RETRIES - 1) {
          throw new Error(
            `LLM output violates constraints after ${MAX_RETRIES} attempts: ${errors.map((e) => e.message).join(', ')}`,
          );
        }
      } catch (err) {
        if (attempt === MAX_RETRIES - 1) throw err;
      }
    }

    throw new Error('Unreachable');
  }
}
