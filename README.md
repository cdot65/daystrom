# Daystrom

**Automated Prisma AIRS custom topic guardrail generator with iterative, self-improving refinement.**

Named after Dr. Richard Daystrom's self-learning M-5 multitronic unit from Star Trek TOS — a system designed to improve itself through experience. Daystrom generates, tests, evaluates, and refines Palo Alto Prisma AIRS custom topic guardrails in an autonomous loop, learning from each run to produce better results over time.

## What It Does

Daystrom automates the creation and optimization of [Prisma AIRS](https://docs.paloaltonetworks.com/ai-runtime-security) custom topic guardrails — content detection rules that tell the AIRS scanner what prompts to block or allow. Instead of manually crafting topic definitions and testing them by hand, Daystrom:

1. **Generates** a custom topic definition (name, description, up to 5 examples) using an LLM, informed by any prior learnings from previous runs
2. **Deploys** the topic to a live Prisma AIRS security profile via the Management API (OAuth2)
3. **Generates test cases** — balanced positive prompts (should trigger detection) and negative prompts (should not trigger)
4. **Scans** all test prompts against the live AIRS Scan API with configurable concurrency
5. **Evaluates** efficacy: true positive rate, true negative rate, accuracy, coverage (`min(TPR, TNR)`), and F1 score
6. **Analyzes** false positives and false negatives using the LLM to identify patterns
7. **Improves** the topic definition iteratively — refining description and examples while keeping the topic name locked
8. **Learns** — after the loop completes, extracts actionable insights and persists them for future runs on similar topics

The loop runs until coverage reaches a target threshold (default 90%) or max iterations (default 20) are exhausted.

## Quick Start

### Install from npm

```bash
npm install -g daystrom
```

Requires **Node.js >= 20**. Verify with `node -v`.

### Configure credentials

Create a `.env` file in your working directory or export the variables in your shell:

=== "macOS / Linux"

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export PANW_AI_SEC_API_KEY=your-scan-api-key
export PANW_MGMT_CLIENT_ID=your-client-id
export PANW_MGMT_CLIENT_SECRET=your-client-secret
export PANW_MGMT_TSG_ID=your-tsg-id
```

=== "Windows (PowerShell)"

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
$env:PANW_AI_SEC_API_KEY = "your-scan-api-key"
$env:PANW_MGMT_CLIENT_ID = "your-client-id"
$env:PANW_MGMT_CLIENT_SECRET = "your-client-secret"
$env:PANW_MGMT_TSG_ID = "your-tsg-id"
```

=== "Windows (cmd)"

```cmd
set ANTHROPIC_API_KEY=sk-ant-...
set PANW_AI_SEC_API_KEY=your-scan-api-key
set PANW_MGMT_CLIENT_ID=your-client-id
set PANW_MGMT_CLIENT_SECRET=your-client-secret
set PANW_MGMT_TSG_ID=your-tsg-id
```

See [Configuration](https://cdot65.github.io/daystrom/getting-started/configuration/) for all env vars and provider options.

### Run

```bash
# Interactive mode (prompts for topic, profile, intent, etc.)
daystrom generate

# Non-interactive
daystrom generate \
  --provider claude-api \
  --profile my-security-profile \
  --topic "Block discussions about building explosives" \
  --intent block \
  --target-coverage 90
```

### Docker

```bash
docker run --rm --env-file .env \
  -v ~/.daystrom:/root/.daystrom \
  ghcr.io/cdot65/daystrom generate \
  --profile my-security-profile \
  --topic "Block discussions about building explosives" \
  --intent block
```

Multi-arch image (amd64 + arm64) available at `ghcr.io/cdot65/daystrom`.

### Development (from source)

```bash
git clone git@github.com:cdot65/daystrom.git
cd daystrom
pnpm install
cp .env.example .env
# Edit .env with your credentials
pnpm run generate
```

## Commands

All commands use `daystrom` as the binary name (or `pnpm run dev` in development):

| Command | Description |
|---------|-------------|
| `daystrom generate` | Start a new guardrail generation loop |
| `daystrom resume <runId>` | Resume a paused or failed run with additional iterations |
| `daystrom report <runId>` | View detailed results for a saved run (best or specific iteration) |
| `daystrom list` | List all saved runs with status and coverage |

### Generate Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--provider <name>` | `claude-api` | LLM provider (`claude-api`, `claude-vertex`, `claude-bedrock`, `gemini-api`, `gemini-vertex`, `gemini-bedrock`) |
| `--model <name>` | per-provider | Override the default model |
| `--profile <name>` | (prompted) | AIRS security profile name to attach the topic to |
| `--topic <desc>` | (prompted) | Natural language description of what to detect |
| `--intent <block\|allow>` | `block` | Whether matching prompts should be blocked or allowed |
| `--max-iterations <n>` | `20` | Maximum refinement iterations |
| `--target-coverage <n>` | `90` | Coverage percentage to stop at |
| `--no-memory` | memory on | Disable cross-run learning for this run |

## Documentation

Full documentation: **[cdot65.github.io/daystrom](https://cdot65.github.io/daystrom/)**

## Tech Stack

- **TypeScript ESM** on Node.js 20+ with strict mode
- **LangChain.js** — Claude (Anthropic API, Vertex, Bedrock) and Gemini (API, Vertex, Bedrock) with structured output via Zod schemas
- **Prisma AIRS SDK** (`@cdot65/prisma-airs-sdk@^0.2.0`) — scan API + management API (OAuth2 client credentials)
- **Commander.js** — CLI framework with 4 subcommands
- **Vitest** + **MSW** — 165 tests across 17 files (~98% stmt coverage)
- **Biome** — linting and formatting
- **Zod** — config validation, LLM output parsing, learning extraction schemas

## Project Structure

```
src/
├── cli/              CLI entry, commands (generate/resume/report/list), prompts, renderer
├── config/           Zod-validated config schema + env/file/CLI cascade loader
├── core/             Async generator loop, efficacy metrics, AIRS topic constraints
├── llm/              LangChain provider factory, structured output service, prompt templates
├── airs/             Scanner (sync scan + batch) and Management (CRUD + profile linking) services
├── memory/           Learning store, extractor, budget-aware injector, iteration diff
└── persistence/      JSON file store for run state
```

## License

MIT
