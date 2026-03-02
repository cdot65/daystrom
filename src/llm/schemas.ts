import { z } from 'zod';

export const CustomTopicSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(250),
  examples: z.array(z.string().min(1).max(250)).min(1).max(5),
});

export const TestCaseSchema = z.object({
  prompt: z.string().min(1),
  expectedTriggered: z.boolean(),
  category: z.string().min(1),
});

export const TestSuiteSchema = z.object({
  positiveTests: z.array(TestCaseSchema).min(1),
  negativeTests: z.array(TestCaseSchema).min(1),
});

export const AnalysisReportSchema = z.object({
  summary: z.string().min(1),
  falsePositivePatterns: z.array(z.string()),
  falseNegativePatterns: z.array(z.string()),
  suggestions: z.array(z.string()).min(1),
});

export type CustomTopicOutput = z.infer<typeof CustomTopicSchema>;
export type TestSuiteOutput = z.infer<typeof TestSuiteSchema>;
export type AnalysisReportOutput = z.infer<typeof AnalysisReportSchema>;
