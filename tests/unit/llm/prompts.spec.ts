import { describe, expect, it } from 'vitest';
import { analyzeResultsPrompt } from '../../../src/llm/prompts/analyze-results.js';
import { generateTestsPrompt } from '../../../src/llm/prompts/generate-tests.js';
import {
  buildSeedExamplesSection,
  generateTopicPrompt,
} from '../../../src/llm/prompts/generate-topic.js';
import { improveTopicPrompt } from '../../../src/llm/prompts/improve-topic.js';

describe('buildSeedExamplesSection', () => {
  it('returns empty string for undefined', () => {
    expect(buildSeedExamplesSection(undefined)).toBe('');
  });

  it('returns empty string for empty array', () => {
    expect(buildSeedExamplesSection([])).toBe('');
  });

  it('returns numbered list for seeds', () => {
    const result = buildSeedExamplesSection(['alpha', 'beta']);
    expect(result).toContain('1. alpha');
    expect(result).toContain('2. beta');
    expect(result).toContain('Seed examples');
  });
});

describe('prompt templates', () => {
  it('generateTopicPrompt has expected input variables', () => {
    const vars = generateTopicPrompt.inputVariables;
    expect(vars).toContain('topicDescription');
    expect(vars).toContain('intent');
    expect(vars).toContain('seedExamplesSection');
    expect(vars).toContain('memorySection');
  });

  it('generateTestsPrompt has expected input variables', () => {
    const vars = generateTestsPrompt.inputVariables;
    expect(vars).toContain('topicName');
    expect(vars).toContain('topicDescription');
    expect(vars).toContain('topicExamples');
    expect(vars).toContain('intent');
    expect(vars).toContain('memorySection');
  });

  it('analyzeResultsPrompt has expected input variables', () => {
    const vars = analyzeResultsPrompt.inputVariables;
    expect(vars).toContain('topicName');
    expect(vars).toContain('topicDescription');
    expect(vars).toContain('falsePositives');
    expect(vars).toContain('falseNegatives');
    expect(vars).toContain('intent');
    expect(vars).toContain('memorySection');
  });

  it('improveTopicPrompt has expected input variables', () => {
    const vars = improveTopicPrompt.inputVariables;
    expect(vars).toContain('currentName');
    expect(vars).toContain('currentDescription');
    expect(vars).toContain('currentExamples');
    expect(vars).toContain('iteration');
    expect(vars).toContain('intent');
    expect(vars).toContain('memorySection');
  });
});
