# LLM Providers

## Overview

Daystrom supports six LLM provider configurations across three platforms:

| Provider Value | SDK | Auth Method | Default Model |
|----------------|-----|-------------|---------------|
| `claude-api` | `@langchain/anthropic` | API key | `claude-opus-4-6` |
| `claude-vertex` | `@anthropic-ai/vertex-sdk` + `@langchain/anthropic` | Application Default Credentials | `claude-opus-4-6` |
| `claude-bedrock` | `@langchain/aws` | IAM credentials / default chain | `anthropic.claude-opus-4-6-v1` |
| `gemini-api` | `@langchain/google-genai` | API key | `gemini-2.0-flash` |
| `gemini-vertex` | `@langchain/google-vertexai` | Application Default Credentials | `gemini-2.0-flash` |
| `gemini-bedrock` | `@langchain/aws` | IAM credentials / default chain | `gemini-2.0-flash` |

All providers use `temperature: 0` and LangChain's `withStructuredOutput(ZodSchema)` with 3 retries on parse failure.

## SaaS API Endpoints

### `claude-api`

Direct Anthropic API access. Simplest setup.

| Env Var | Required | Description |
|---------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key (`sk-ant-...`) |

```bash
# .env
LLM_PROVIDER=claude-api
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
# CLI
pnpm run generate --provider claude-api
```

### `gemini-api`

Direct Google AI Studio API access.

| Env Var | Required | Description |
|---------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Google AI API key |

```bash
# .env
LLM_PROVIDER=gemini-api
GOOGLE_API_KEY=AIza...
```

```bash
# CLI
pnpm run generate --provider gemini-api
```

## Google Cloud Vertex AI

Both `claude-vertex` and `gemini-vertex` authenticate via [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials). Set up ADC before using either:

```bash
gcloud auth application-default login
```

| Env Var | Required | Default | Description |
|---------|----------|---------|-------------|
| `GOOGLE_CLOUD_PROJECT` | Yes | — | GCP project ID |
| `GOOGLE_CLOUD_LOCATION` | No | `us-central1` (gemini), `global` (claude) | GCP region |

### `claude-vertex`

Uses `@anthropic-ai/vertex-sdk` to create a Vertex-authenticated client, then passes it to `ChatAnthropic` via the `createClient` pattern.

**Region**: The default region for `claude-vertex` is `global`. This differs from `gemini-vertex` which defaults to `us-central1`. Set `GOOGLE_CLOUD_LOCATION=global` or use `CLOUD_ML_REGION=global`.

**Model naming**: Vertex AI Claude models use the same ID as the API — e.g. `claude-opus-4-6` (not the legacy `@date` format).

```bash
# .env
LLM_PROVIDER=claude-vertex
GOOGLE_CLOUD_PROJECT=my-project-id
GOOGLE_CLOUD_LOCATION=global
```

```bash
# CLI
pnpm run generate --provider claude-vertex
pnpm run generate --provider claude-vertex --model claude-opus-4-6
```

### `gemini-vertex`

Uses `@langchain/google-vertexai` (`ChatVertexAI`). Project ID is passed via `authOptions.projectId`.

```bash
# .env
LLM_PROVIDER=gemini-vertex
GOOGLE_CLOUD_PROJECT=my-project-id
GOOGLE_CLOUD_LOCATION=us-central1
```

```bash
# CLI
pnpm run generate --provider gemini-vertex
pnpm run generate --provider gemini-vertex --model gemini-2.0-flash
```

## AWS Bedrock

Both `claude-bedrock` and `gemini-bedrock` use `@langchain/aws` (`ChatBedrockConverse`).

**Auth**: When `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are both set, explicit credentials are used. Otherwise, falls back to the [AWS default credential chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html) (instance profile, SSO, `~/.aws/credentials`, etc.).

| Env Var | Required | Default | Description |
|---------|----------|---------|-------------|
| `AWS_REGION` | No | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | No* | — | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | No* | — | IAM secret key |

\* Not required if using the default credential chain.

### `claude-bedrock`

**Model ID format**: Bedrock model IDs use the full ARN-style format — e.g. `anthropic.claude-opus-4-6-v1`.

```bash
# .env
LLM_PROVIDER=claude-bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

```bash
# CLI
pnpm run generate --provider claude-bedrock
pnpm run generate --provider claude-bedrock --model anthropic.claude-opus-4-6-v1
```

### `gemini-bedrock`

```bash
# .env
LLM_PROVIDER=gemini-bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

```bash
# CLI
pnpm run generate --provider gemini-bedrock
pnpm run generate --provider gemini-bedrock --model gemini-2.0-flash
```

## Model Override

Override the default model for any provider with `--model` or the `LLM_MODEL` env var:

```bash
# Via CLI flag
pnpm run generate --provider claude-api --model claude-opus-4-6

# Via env var
LLM_MODEL=gemini-2.0-flash pnpm run generate --provider gemini-api
```

**Naming conventions differ per platform** — use the correct format:

| Platform | Example |
|----------|---------|
| Anthropic API | `claude-opus-4-6` |
| Vertex AI (Claude) | `claude-opus-4-6` |
| Bedrock (Claude) | `anthropic.claude-opus-4-6-v1` |
| Google AI / Vertex / Bedrock (Gemini) | `gemini-2.0-flash` |

## Config Cascade

Configuration is resolved in this priority order (highest wins):

1. **CLI flags** (`--provider`, `--model`)
2. **Environment variables** (`LLM_PROVIDER`, `LLM_MODEL`, etc.)
3. **Config file** (`~/.prisma-airs-guardrails/config.json`)
4. **Zod schema defaults** (e.g. `claude-api`, `global`/`us-central1`, `us-east-1`)

See [Installation](INSTALL.md) for full config file and tuning parameter details.

## Troubleshooting

### SaaS API (`claude-api`, `gemini-api`)

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` / `invalid x-api-key` | Missing or invalid API key | Check `ANTHROPIC_API_KEY` or `GOOGLE_API_KEY` |
| `429 Rate limit` | Too many requests | Reduce `SCAN_CONCURRENCY` or wait |
| `Could not resolve model` | Wrong model name for provider | Verify model name matches API format |

### Vertex AI (`claude-vertex`, `gemini-vertex`)

| Error | Cause | Fix |
|-------|-------|-----|
| `Could not load the default credentials` | ADC not configured | Run `gcloud auth application-default login` |
| `Project not found` / `Permission denied` | Wrong project or missing IAM roles | Verify `GOOGLE_CLOUD_PROJECT`; ensure `Vertex AI User` role |
| `Model not found` | Wrong model name or region | Use `@` date format for Claude; check region availability |

### Bedrock (`claude-bedrock`, `gemini-bedrock`)

| Error | Cause | Fix |
|-------|-------|-----|
| `UnrecognizedClientException` | Invalid AWS credentials | Check `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` |
| `AccessDeniedException` | Model not enabled | Enable the model in the Bedrock console for your region |
| `ValidationException` | Wrong model ID format | Use full Bedrock model ID (e.g. `anthropic.claude-opus-4-6-v1`) |
| `Could not resolve credentials` | No credentials found | Set env vars or configure `~/.aws/credentials` |
