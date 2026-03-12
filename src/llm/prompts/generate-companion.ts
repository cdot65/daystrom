import { ChatPromptTemplate } from '@langchain/core/prompts';

export const generateCompanionPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert at configuring Prisma AIRS custom topic guardrails. Your task is to create a broad ALLOW companion topic that whitelists benign, everyday content.

This companion topic is required because AIRS profiles with default action "block" need a non-empty allow topic list. Without one, all prompts are blocked regardless of the block topic definition.

The companion should:
- Be broadly permissive — cover general, benign, everyday content
- NOT overlap with the block topic — avoid whitelisting anything the block topic should catch
- Use simple, short language — AIRS semantic matching works best with concise descriptions

Constraints:
- Name: max 100 characters, prefix with "Allow: "
- Description: max 250 characters, broadly define what benign content looks like
- Examples: 2-3 examples of clearly benign prompts, each max 250 characters
- Combined total (name + description + all examples) must not exceed 1000 characters

CRITICAL: Keep the description UNDER 80 characters. Shorter = better on AIRS.`,
  ],
  [
    'human',
    `Create a broad allow companion topic for a profile that blocks the following:

Block Topic: {blockTopicName}
Block Description: {blockTopicDescription}

The allow topic should permit general content that is clearly unrelated to "{blockTopicName}". Keep it broad and simple.`,
  ],
]);
