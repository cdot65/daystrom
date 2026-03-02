import { z } from 'zod';

export const LlmProviderSchema = z.enum([
  'claude-api',
  'claude-vertex',
  'claude-bedrock',
  'gemini-api',
  'gemini-vertex',
  'gemini-bedrock',
]);

export type LlmProvider = z.infer<typeof LlmProviderSchema>;

export const ConfigSchema = z.object({
  llmProvider: LlmProviderSchema.default('claude-api'),
  llmModel: z.string().optional(),

  // Claude API
  anthropicApiKey: z.string().optional(),

  // Google AI
  googleApiKey: z.string().optional(),

  // Google Vertex
  googleCloudProject: z.string().optional(),
  googleCloudLocation: z.string().default('us-central1'),

  // AWS Bedrock
  awsRegion: z.string().default('us-east-1'),
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),

  // AIRS Scanner
  airsApiKey: z.string().optional(),

  // AIRS Management
  mgmtClientId: z.string().optional(),
  mgmtClientSecret: z.string().optional(),
  mgmtTsgId: z.string().optional(),

  // Tuning
  scanConcurrency: z.coerce.number().int().min(1).max(20).default(5),
  propagationDelayMs: z.coerce.number().int().min(0).default(10000),

  // Persistence
  dataDir: z.string().default('~/.prisma-airs-guardrails/runs'),
});

export type Config = z.infer<typeof ConfigSchema>;
