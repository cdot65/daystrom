# Installation

## Prerequisites

- **Node.js** ≥ 20.0.0 (ES2022 target)
- **pnpm** (recommended) or npm
- **Prisma AIRS** access — you need two separate sets of credentials:
  - **AI Security Scan API key** — for scanning prompts against security profiles
  - **Management API OAuth2 client credentials** — for creating/updating custom topics and linking them to security profiles. Requires: client ID, client secret, and TSG ID (Tenant Service Group)
- **LLM provider credentials** (at least one):
  - Anthropic API key (for `claude-api` provider), or
  - Google API key (for `gemini-api` provider), or
  - Google Cloud project configured (for `claude-vertex` or `gemini-vertex`), or
  - AWS credentials configured (for `claude-bedrock` or `gemini-bedrock`)

## Setup

```bash
# Clone the repository
git clone git@github.com:cdot65/daystrom.git
cd daystrom

# Install dependencies
pnpm install

# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your credentials. At minimum you need an LLM provider key and both AIRS credential sets:

```bash
# ── LLM Provider ──────────────────────────────────────────────────────
# Options: claude-api | claude-vertex | claude-bedrock | gemini-api | gemini-vertex | gemini-bedrock
LLM_PROVIDER=claude-api
ANTHROPIC_API_KEY=sk-ant-...

# ── AIRS Scan API (API key auth) ─────────────────────────────────────
PANW_AI_SEC_API_KEY=your-scan-api-key

# ── AIRS Management API (OAuth2 client credentials) ──────────────────
PANW_MGMT_CLIENT_ID=your-client-id
PANW_MGMT_CLIENT_SECRET=your-client-secret
PANW_MGMT_TSG_ID=your-tsg-id
```

## Build & Run

```bash
# Development mode (tsx — no build step, runs TypeScript directly)
pnpm run generate

# Production build
pnpm run build             # Compiles to dist/
node dist/cli/index.js generate

# Other dev commands
pnpm run dev generate      # Same as pnpm run generate
pnpm run dev resume <id>   # Resume a paused run
pnpm run dev report <id>   # View run results
pnpm run dev list          # List all saved runs
```

## LLM Provider Configuration

Each provider requires different environment variables. Only configure the provider you intend to use.

| Provider | Env Vars Required | Default Model |
|----------|-------------------|---------------|
| `claude-api` (default) | `ANTHROPIC_API_KEY` | `claude-opus-4-6` |
| `claude-vertex` | `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` | `claude-opus-4-6` |
| `claude-bedrock` | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `anthropic.claude-opus-4-6-v1` |
| `gemini-api` | `GOOGLE_API_KEY` | `gemini-2.0-flash` |
| `gemini-vertex` | `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` | `gemini-2.0-flash` |
| `gemini-bedrock` | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `gemini-2.0-flash` |

All LLM calls use `temperature: 0` for deterministic output. You can override the model with `--model <name>` or `LLM_MODEL` env var.

For detailed setup instructions for each provider, see [LLM Providers](LLM-PROVIDERS.md).

## AIRS Credential Details

### Scan API
The scan API key authenticates requests to scan prompts against security profiles. Obtain it from the Prisma AIRS console under API Keys.

```bash
PANW_AI_SEC_API_KEY=your-key-here
# Alternative: use a bearer token instead
# PANW_AI_SEC_API_TOKEN=your-token-here
```

### Management API
The management API uses OAuth2 client credentials flow (handled by the SDK). You need:

- **Client ID** and **Client Secret** — created in the Palo Alto Networks hub under Service Accounts
- **TSG ID** — your Tenant Service Group identifier

```bash
PANW_MGMT_CLIENT_ID=your-client-id
PANW_MGMT_CLIENT_SECRET=your-client-secret
PANW_MGMT_TSG_ID=your-tsg-id
# Optional endpoint overrides (defaults to production):
# PANW_MGMT_ENDPOINT=https://api.sase.paloaltonetworks.com/aisec
# PANW_MGMT_TOKEN_ENDPOINT=https://auth.apps.paloaltonetworks.com/oauth2/access_token
```

## Tuning Parameters

These control loop behavior and can be set via env vars, config file, or (where applicable) CLI flags.

| Env Var | Config Key | Default | Range | Description |
|---------|------------|---------|-------|-------------|
| `SCAN_CONCURRENCY` | `scanConcurrency` | `5` | 1–20 | Parallel scan API requests per batch. Higher values speed up testing but risk rate limiting. |
| `PROPAGATION_DELAY_MS` | `propagationDelayMs` | `10000` | ≥ 0 | Milliseconds to wait after deploying a topic before scanning. AIRS needs time to propagate changes. Reduce for faster iteration at the risk of stale scan results. |
| `MAX_MEMORY_CHARS` | `maxMemoryChars` | `3000` | 500–10000 | Character budget for the memory section injected into LLM prompts. Higher values include more learnings but consume more prompt context. |
| `MEMORY_ENABLED` | `memoryEnabled` | `true` | — | Enable/disable the cross-run learning system entirely. |
| `DATA_DIR` | `dataDir` | `~/.daystrom/runs` | — | Directory for persisted run states. |
| `MEMORY_DIR` | `memoryDir` | `~/.daystrom/memory` | — | Directory for cross-run learning files. |

## Config File (Optional)

You can place a JSON config file at `~/.daystrom/config.json` with camelCase keys matching the schema. Values here are overridden by env vars and CLI flags.

```json
{
  "llmProvider": "claude-api",
  "scanConcurrency": 3,
  "propagationDelayMs": 15000,
  "maxMemoryChars": 5000
}
```

## Data Locations

| Path | Purpose |
|------|---------|
| `~/.daystrom/runs/` | Persisted run states (JSON per run) |
| `~/.daystrom/memory/` | Cross-run learning store (JSON per topic category) |
| `~/.daystrom/config.json` | Optional config file |

## Verify Installation

```bash
pnpm test              # Run all 165 tests
pnpm run lint          # Biome lint check
pnpm tsc --noEmit      # TypeScript type-check (strict mode)
```

All tests should pass without any AIRS credentials — they use MSW to mock HTTP responses.
