# LLM Providers Overview

Daystrom supports **6 provider configurations** across 3 platforms (Anthropic, Google, AWS). All providers use `temperature: 0` and LangChain's `withStructuredOutput(ZodSchema)` with 3 retries on parse failure.

## Supported Providers

| Provider Value | SDK | Auth Method | Default Model |
|----------------|-----|-------------|---------------|
| `claude-api` | `@langchain/anthropic` | API key | `claude-opus-4-6` |
| `claude-vertex` | `@anthropic-ai/vertex-sdk` + `@langchain/anthropic` | Application Default Credentials | `claude-opus-4-6` |
| `claude-bedrock` | `@langchain/aws` | IAM credentials / default chain | `anthropic.claude-opus-4-6-v1` |
| `gemini-api` | `@langchain/google-genai` | API key | `gemini-2.0-flash` |
| `gemini-vertex` | `@langchain/google-vertexai` | Application Default Credentials | `gemini-2.0-flash` |
| `gemini-bedrock` | `@langchain/aws` | IAM credentials / default chain | `gemini-2.0-flash` |

## Model Override

Use the `--model` flag or `LLM_MODEL` environment variable to override the default model for any provider.

```bash
# CLI flag
pnpm run generate -- --model claude-sonnet-4-20250514

# Environment variable
export LLM_MODEL=claude-sonnet-4-20250514
```

!!! warning "Model naming conventions differ per platform"

    Always use the correct format for your chosen provider.

| Platform | Example |
|----------|---------|
| Anthropic API | `claude-opus-4-6` |
| Vertex AI (Claude) | `claude-opus-4-6` |
| Bedrock (Claude) | `anthropic.claude-opus-4-6-v1` |
| Google AI / Vertex / Bedrock (Gemini) | `gemini-2.0-flash` |

## Config Cascade

Daystrom resolves configuration in the following priority order:

1. **CLI flags** -- highest priority
2. **Environment variables**
3. **Config file** (`~/.daystrom/config.json`)
4. **Zod defaults** -- lowest priority

!!! tip

    Set your preferred provider and model in `~/.daystrom/config.json` to avoid repeating flags on every run.

    ```json
    {
      "llmProvider": "claude-api",
      "llmModel": "claude-opus-4-6"
    }
    ```

## Choosing a Provider

| Consideration | SaaS APIs | Vertex AI | Bedrock |
|---------------|-----------|-----------|---------|
| Setup complexity | Lowest | Medium | Medium |
| Auth mechanism | API key | ADC (gcloud) | IAM / credential chain |
| Data residency control | No | Yes (GCP region) | Yes (AWS region) |
| Existing cloud billing | Not needed | GCP project | AWS account |

For detailed setup instructions, see the provider-specific pages:

- [SaaS APIs](saas-apis.md) -- `claude-api`, `gemini-api`
- [Vertex AI](vertex-ai.md) -- `claude-vertex`, `gemini-vertex`
- [AWS Bedrock](bedrock.md) -- `claude-bedrock`, `gemini-bedrock`
