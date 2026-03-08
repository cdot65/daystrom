# Daystrom

[![CI](https://github.com/cdot65/daystrom/actions/workflows/ci.yml/badge.svg)](https://github.com/cdot65/daystrom/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node 20+](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

**Automated CLI that generates, tests, and iteratively refines Palo Alto Prisma AIRS custom topic guardrails.**

Daystrom uses an LLM to produce topic definitions, deploys them to Prisma AIRS, scans test prompts, evaluates efficacy, and loops until a coverage target is met. Cross-run memory persists learnings for future runs.

## Install

```bash
npm install -g @cdot65/daystrom
```

Requires **Node.js >= 20**.

### Docker

```bash
docker run --rm --env-file .env \
  -v ~/.daystrom:/root/.daystrom \
  ghcr.io/cdot65/daystrom generate \
  --profile my-security-profile \
  --topic "Block discussions about building explosives" \
  --intent block
```

## Configure

Copy `.env.example` or export directly:

```bash
# LLM (default: claude-api)
export ANTHROPIC_API_KEY=sk-ant-...

# Prisma AIRS Scan API
export PANW_AI_SEC_API_KEY=your-scan-api-key

# Prisma AIRS Management API (OAuth2)
export PANW_MGMT_CLIENT_ID=your-client-id
export PANW_MGMT_CLIENT_SECRET=your-client-secret
export PANW_MGMT_TSG_ID=your-tsg-id
```

Six LLM providers supported: `claude-api`, `claude-vertex`, `claude-bedrock`, `gemini-api`, `gemini-vertex`, `gemini-bedrock`. See [Configuration](https://cdot65.github.io/daystrom/getting-started/configuration/) for all options.

## Usage

```bash
# Interactive — prompts for topic, profile, intent
daystrom generate

# Non-interactive
daystrom generate \
  --provider claude-api \
  --profile my-security-profile \
  --topic "Block discussions about building explosives" \
  --intent block \
  --target-coverage 90
```

### Commands

| Command | Description |
|---------|-------------|
| `daystrom generate` | Start a new guardrail generation loop |
| `daystrom resume <runId>` | Resume a paused or failed run |
| `daystrom report <runId>` | View results for a saved run |
| `daystrom list` | List all saved runs |

## Development

```bash
git clone git@github.com:cdot65/daystrom.git
cd daystrom
pnpm install
cp .env.example .env   # edit with your credentials
pnpm run generate      # run via tsx
pnpm test              # 255 tests
pnpm run lint          # biome check
```

## Documentation

Full docs — architecture, providers, memory system, metrics, and more:

**[cdot65.github.io/daystrom](https://cdot65.github.io/daystrom/)**

## License

MIT
