import { input, select, confirm, number } from '@inquirer/prompts';
import type { UserInput } from '../core/types.js';
import type { LlmProvider } from '../config/schema.js';

export async function collectUserInput(): Promise<UserInput> {
  const topicDescription = await input({
    message: 'Describe the topic to create a guardrail for:',
    validate: (v) => (v.trim().length > 0 ? true : 'Description is required'),
  });

  const intent = await select<'allow' | 'block'>({
    message: 'Should this topic be blocked or allowed?',
    choices: [
      { name: 'Block', value: 'block' },
      { name: 'Allow', value: 'allow' },
    ],
  });

  const profileName = await input({
    message: 'AIRS security profile name:',
    validate: (v) => (v.trim().length > 0 ? true : 'Profile name is required'),
  });

  const hasSeedExamples = await confirm({
    message: 'Do you have seed examples to provide?',
    default: false,
  });

  let seedExamples: string[] | undefined;
  if (hasSeedExamples) {
    const examplesRaw = await input({
      message: 'Enter examples (one per line, empty line to finish):\nPaste examples separated by newlines:',
    });
    seedExamples = examplesRaw
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  const maxIterations =
    (await number({
      message: 'Max iterations (default 20):',
      default: 20,
      min: 1,
      max: 100,
    })) ?? 20;

  const targetCoverageRaw =
    (await number({
      message: 'Target coverage % (default 90):',
      default: 90,
      min: 10,
      max: 100,
    })) ?? 90;

  return {
    topicDescription,
    intent,
    profileName,
    seedExamples,
    maxIterations,
    targetCoverage: targetCoverageRaw / 100,
  };
}

export async function selectLlmProvider(): Promise<LlmProvider> {
  return select<LlmProvider>({
    message: 'Select LLM provider:',
    choices: [
      { name: 'Claude API', value: 'claude-api' },
      { name: 'Claude (Vertex AI)', value: 'claude-vertex' },
      { name: 'Claude (Bedrock)', value: 'claude-bedrock' },
      { name: 'Gemini API', value: 'gemini-api' },
      { name: 'Gemini (Vertex AI)', value: 'gemini-vertex' },
      { name: 'Gemini (Bedrock)', value: 'gemini-bedrock' },
    ],
  });
}

export async function confirmContinue(iteration: number, coverage: number): Promise<boolean> {
  return confirm({
    message: `Iteration ${iteration} complete (coverage: ${(coverage * 100).toFixed(1)}%). Continue refining?`,
    default: true,
  });
}
