import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatVertexAI } from '@langchain/google-vertexai';
import { ChatBedrockConverse } from '@langchain/aws';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LlmProvider } from '../config/schema.js';

export interface LlmProviderConfig {
  provider: LlmProvider;
  model?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
  googleCloudProject?: string;
  googleCloudLocation?: string;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
}

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  'claude-api': 'claude-sonnet-4-20250514',
  'claude-vertex': 'claude-sonnet-4@20250514',
  'claude-bedrock': 'anthropic.claude-sonnet-4-20250514-v1:0',
  'gemini-api': 'gemini-2.0-flash',
  'gemini-vertex': 'gemini-2.0-flash',
  'gemini-bedrock': 'gemini-2.0-flash',
};

export function createLlmProvider(config: LlmProviderConfig): BaseChatModel {
  const modelName = config.model ?? DEFAULT_MODELS[config.provider];

  switch (config.provider) {
    case 'claude-api':
      return new ChatAnthropic({
        model: modelName,
        anthropicApiKey: config.anthropicApiKey,
        temperature: 0,
      });

    case 'claude-vertex':
      return new ChatAnthropic({
        model: modelName,
        temperature: 0,
      });

    case 'claude-bedrock':
      return new ChatBedrockConverse({
        model: modelName,
        region: config.awsRegion ?? 'us-east-1',
        temperature: 0,
      });

    case 'gemini-api':
      return new ChatGoogleGenerativeAI({
        model: modelName,
        apiKey: config.googleApiKey,
        temperature: 0,
      });

    case 'gemini-vertex':
      return new ChatVertexAI({
        model: modelName,
        location: config.googleCloudLocation ?? 'us-central1',
        temperature: 0,
      });

    case 'gemini-bedrock':
      return new ChatBedrockConverse({
        model: modelName,
        region: config.awsRegion ?? 'us-east-1',
        temperature: 0,
      });

    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}
