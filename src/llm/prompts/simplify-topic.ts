import { ChatPromptTemplate } from '@langchain/core/prompts';

export const simplifyTopicPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert at simplifying Prisma AIRS custom topic guardrails. Your goal is to produce a SHORTER, SIMPLER definition that performs better than the current over-refined one.

Constraints (MUST be respected):
- Name: KEEP THE EXACT SAME NAME as the current definition. Do NOT rename.
- Description: max 250 characters
- Examples: 2-5 examples, each max 250 characters
- Combined total (name + description + all examples): max 1000 characters

WHY SIMPLIFICATION WORKS:
- AIRS uses semantic similarity matching, NOT logical constraint evaluation
- Exclusion clauses ("not X", "excludes Y") are IGNORED and often INCREASE false positives
- Shorter descriptions (under 100 chars) consistently outperform longer ones
- Over-refinement across iterations typically DEGRADES coverage by adding noise
- The best-performing definition was usually simpler than the current one

SIMPLIFICATION STRATEGY:
1. Remove ALL exclusion/negation clauses from the description
2. Aim for a description UNDER 100 characters — shorter is better
3. Use 2-3 focused examples instead of 5 broad ones
4. Revert toward the best-performing definition's style and language
5. Use clear, direct, positive language — state what the topic IS, not what it ISN'T
6. Prefer concrete nouns and verbs over abstract qualifiers

Intent: {intent}
- "block" (blacklist): Keep the description broad enough to catch violations, but remove noise that causes false positives on unrelated content.
- "allow" (whitelist): Make the description precise enough that only truly matching content triggers, with no semantic bleed into adjacent domains.
{memorySection}`,
  ],
  [
    'human',
    `The current definition has been over-refined and coverage is regressing. Simplify it.

Current Definition (over-refined):
- Name: {currentName}
- Description: {currentDescription}
- Examples: {currentExamples}

Best-Performing Definition (simpler, achieved {bestCoverage} coverage):
- Description: {bestDescription}
- Examples: {bestExamples}

Current Performance:
- Coverage: {coverage}
- TPR: {tpr}, TNR: {tnr}

Generate a SIMPLER topic definition that reverts toward the best-performing version while incorporating any genuine improvements from refinement iterations. Prioritize brevity and clarity over specificity.`,
  ],
]);
