import { ChatPromptTemplate } from '@langchain/core/prompts';

export const generateTopicPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert at configuring Prisma AIRS custom topic guardrails. Your job is to create a topic definition that will effectively {intent} conversations about the described topic.

Constraints:
- Name: max 100 characters, concise and descriptive
- Description: max 250 characters, clearly defines what should be detected
- Examples: 1-5 examples, each max 250 characters
- Combined total (name + description + all examples) must not exceed 1000 characters

The description should be specific enough to catch relevant content but not so broad that it triggers on unrelated topics. Examples should represent diverse ways users might discuss the topic.
{memorySection}`,
  ],
  [
    'human',
    `Create a custom topic guardrail to {intent} the following:

Topic: {topicDescription}

{seedExamplesSection}

Generate a topic definition with a name, description, and up to 5 representative examples.`,
  ],
]);

export function buildSeedExamplesSection(seeds?: string[]): string {
  if (!seeds || seeds.length === 0) return '';
  return `Seed examples to build upon:\n${seeds.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
}
