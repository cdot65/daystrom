# Installation

## Prerequisites

- **Node.js** ≥ 20.0.0
- **pnpm** (recommended) or npm
- **Prisma AIRS** access:
  - AI Security scan API key
  - Management API OAuth2 client credentials (client ID, secret, TSG ID)
- **LLM provider** credentials (at least one):
  - Anthropic API key (Claude), or
  - Google API key (Gemini), or
  - Google Cloud project (Vertex AI), or
  - AWS credentials (Bedrock)

## Setup

```bash
# Clone
git clone git@github.com:cdot65/daystrom.git
cd daystrom

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# LLM (pick one provider)
LLM_PROVIDER=claude-api
ANTHROPIC_API_KEY=sk-ant-...

# AIRS Scan API
PANW_AI_SEC_API_KEY=your-scan-api-key

# AIRS Management API (OAuth2)
PANW_MGMT_CLIENT_ID=your-client-id
PANW_MGMT_CLIENT_SECRET=your-client-secret
PANW_MGMT_TSG_ID=your-tsg-id
```

## Build & Run

```bash
# Development (tsx, no build step)
pnpm run generate

# Production build
pnpm run build
node dist/cli/index.js generate
```

## LLM Providers

| Provider | Env Vars Required |
|----------|-------------------|
| `claude-api` (default) | `ANTHROPIC_API_KEY` |
| `claude-vertex` | `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` |
| `claude-bedrock` | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| `gemini-api` | `GOOGLE_API_KEY` |
| `gemini-vertex` | `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` |
| `gemini-bedrock` | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |

## Tuning

| Env Var | Default | Description |
|---------|---------|-------------|
| `SCAN_CONCURRENCY` | 5 | Parallel scan requests (1–20) |
| `PROPAGATION_DELAY_MS` | 10000 | Wait after topic deploy before scanning |
| `MAX_MEMORY_CHARS` | 3000 | Character budget for memory injection (500–10000) |
| `MEMORY_ENABLED` | true | Enable/disable cross-run learning |

## Data Locations

| Path | Purpose |
|------|---------|
| `~/.prisma-airs-guardrails/runs/` | Persisted run states |
| `~/.prisma-airs-guardrails/memory/` | Cross-run learning store |
| `~/.prisma-airs-guardrails/config.json` | Optional config file |

## Verify Installation

```bash
pnpm test          # Run all tests
pnpm run lint      # Check linting
pnpm tsc --noEmit  # Type-check
```
