import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LlmService } from '../core/loop.js';
import type { CustomTopic, TestCase, EfficacyMetrics, TestResult, AnalysisReport } from '../core/types.js';
import { CustomTopicSchema, TestSuiteSchema, AnalysisReportSchema, type CustomTopicOutput, type TestSuiteOutput, type AnalysisReportOutput } from './schemas.js';
import { generateTopicPrompt, buildSeedExamplesSection } from './prompts/generate-topic.js';
import { generateTestsPrompt } from './prompts/generate-tests.js';
import { analyzeResultsPrompt } from './prompts/analyze-results.js';
import { improveTopicPrompt } from './prompts/improve-topic.js';
import { validateTopic } from '../core/constraints.js';

const MAX_RETRIES = 3;

export class LangChainLlmService implements LlmService {
  constructor(private model: BaseChatModel) {}

  async generateTopic(
    description: string,
    intent: string,
    seeds?: string[],
  ): Promise<CustomTopic> {
    const structured = this.model.withStructuredOutput(CustomTopicSchema);
    const chain = generateTopicPrompt.pipe(structured);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const raw = await chain.invoke({
          topicDescription: description,
          intent,
          seedExamplesSection: buildSeedExamplesSection(seeds),
        });
        const result = raw as unknown as CustomTopicOutput;

        const errors = validateTopic(result);
        if (errors.length === 0) return result;

        if (attempt === MAX_RETRIES - 1) {
          throw new Error(`LLM output violates constraints after ${MAX_RETRIES} attempts: ${errors.map((e) => e.message).join(', ')}`);
        }
      } catch (err) {
        if (attempt === MAX_RETRIES - 1) throw err;
        // Retry on parsing/validation failures
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
          tpr: (metrics.truePositiveRate * 100).toFixed(1) + '%',
          tnr: (metrics.trueNegativeRate * 100).toFixed(1) + '%',
          accuracy: (metrics.accuracy * 100).toFixed(1) + '%',
          coverage: (metrics.coverage * 100).toFixed(1) + '%',
          falsePositives: fps.length > 0
            ? fps.map((r) => `- "${r.testCase.prompt}" (${r.testCase.category})`).join('\n')
            : 'None',
          falseNegatives: fns.length > 0
            ? fns.map((r) => `- "${r.testCase.prompt}" (${r.testCase.category})`).join('\n')
            : 'None',
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
          coverage: (metrics.coverage * 100).toFixed(1) + '%',
          targetCoverage: (targetCoverage * 100).toFixed(1) + '%',
          tpr: (metrics.truePositiveRate * 100).toFixed(1) + '%',
          tnr: (metrics.trueNegativeRate * 100).toFixed(1) + '%',
          accuracy: (metrics.accuracy * 100).toFixed(1) + '%',
          analysisSummary: analysis.summary,
          fpPatterns: analysis.falsePositivePatterns.join('; ') || 'None',
          fnPatterns: analysis.falseNegativePatterns.join('; ') || 'None',
          specificFPs: fps.map((r) => `- "${r.testCase.prompt}"`).join('\n') || 'None',
          specificFNs: fns.map((r) => `- "${r.testCase.prompt}"`).join('\n') || 'None',
          suggestions: analysis.suggestions.join('; '),
        });
        const result = raw as unknown as CustomTopicOutput;

        const errors = validateTopic(result);
        if (errors.length === 0) return result;

        if (attempt === MAX_RETRIES - 1) {
          throw new Error(`LLM output violates constraints after ${MAX_RETRIES} attempts: ${errors.map((e) => e.message).join(', ')}`);
        }
      } catch (err) {
        if (attempt === MAX_RETRIES - 1) throw err;
        // Retry on parsing/validation failures
      }
    }

    throw new Error('Unreachable');
  }
}
