# Daystrom

[![CI](https://github.com/cdot65/daystrom/actions/workflows/ci.yml/badge.svg)](https://github.com/cdot65/daystrom/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node 20+](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

**CLI and library for Palo Alto Prisma AIRS — guardrail refinement, AI red teaming, model security scanning, and profile audits.**

Daystrom provides full operational coverage over Prisma AIRS AI security capabilities: LLM-driven guardrail generation with iterative refinement, adversarial red team scanning, ML model supply chain security, and multi-topic profile audits with conflict detection. Cross-run memory persists learnings across guardrail runs.

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

| Command Group | Description |
|---------------|-------------|
| `daystrom generate` | LLM-driven guardrail generation with iterative refinement |
| `daystrom resume <runId>` | Resume a paused or failed generation run |
| `daystrom report <runId>` | View results for a saved run (terminal, JSON, HTML) |
| `daystrom list` | List all saved runs |
| `daystrom audit` | Evaluate all topics in a security profile — per-topic metrics + conflict detection |
| `daystrom redteam` | Red team scanning — targets, prompt sets, scans, reports |
| `daystrom model-security` | ML model supply chain security — groups, rules, scans, labels |

### Red Team

```bash
daystrom redteam targets list
daystrom redteam scan --target <uuid> --name "Scan" --type CUSTOM --prompt-sets <uuid>
daystrom redteam status <jobId>
daystrom redteam report <jobId> --attacks
```

### Model Security

```bash
daystrom model-security groups list
daystrom model-security scans list --eval-outcome BLOCKED
daystrom model-security scans evaluations <scanUuid>
daystrom model-security scans violations <scanUuid>
```

### Profile Audit

```bash
daystrom audit --profile my-security-profile --provider claude-api
```

## Development

```bash
git clone git@github.com:cdot65/daystrom.git
cd daystrom
pnpm install
cp .env.example .env   # edit with your credentials
pnpm run generate      # run via tsx
pnpm test              # run test suite
pnpm run lint          # biome check
```

## Documentation

Full docs — architecture, providers, memory system, metrics, and more:

**[cdot65.github.io/daystrom](https://cdot65.github.io/daystrom/)**

## License

MIT
