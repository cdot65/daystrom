import { describe, it, expect, vi } from 'vitest';
import { createLlmProvider, type LlmProviderConfig } from '../../../src/llm/provider.js';

// Mock all LangChain providers
vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn().mockImplementation((opts) => ({
    _type: 'ChatAnthropic',
    ...opts,
  })),
}));

vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation((opts) => ({
    _type: 'ChatGoogleGenerativeAI',
    ...opts,
  })),
}));

vi.mock('@langchain/google-vertexai', () => ({
  ChatVertexAI: vi.fn().mockImplementation((opts) => ({
    _type: 'ChatVertexAI',
    ...opts,
  })),
}));

vi.mock('@langchain/aws', () => ({
  ChatBedrockConverse: vi.fn().mockImplementation((opts) => ({
    _type: 'ChatBedrockConverse',
    ...opts,
  })),
}));

describe('createLlmProvider', () => {
  it('creates Claude API provider', () => {
    const model = createLlmProvider({
      provider: 'claude-api',
      anthropicApiKey: 'test-key',
    });
    expect(model).toBeDefined();
  });

  it('creates Gemini API provider', () => {
    const model = createLlmProvider({
      provider: 'gemini-api',
      googleApiKey: 'test-key',
    });
    expect(model).toBeDefined();
  });

  it('creates Gemini Vertex provider', () => {
    const model = createLlmProvider({
      provider: 'gemini-vertex',
      googleCloudProject: 'my-project',
      googleCloudLocation: 'us-central1',
    });
    expect(model).toBeDefined();
  });

  it('creates Claude Vertex provider', () => {
    const model = createLlmProvider({
      provider: 'claude-vertex',
      googleCloudProject: 'my-project',
      googleCloudLocation: 'us-east5',
    });
    expect(model).toBeDefined();
  });

  it('creates Claude Bedrock provider', () => {
    const model = createLlmProvider({
      provider: 'claude-bedrock',
      awsRegion: 'us-east-1',
    });
    expect(model).toBeDefined();
  });

  it('creates Gemini Bedrock provider', () => {
    const model = createLlmProvider({
      provider: 'gemini-bedrock',
      awsRegion: 'us-east-1',
    });
    expect(model).toBeDefined();
  });

  it('throws for unknown provider', () => {
    expect(() =>
      createLlmProvider({ provider: 'unknown' as any }),
    ).toThrow();
  });
});
