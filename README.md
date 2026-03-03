# Daystrom

**Automated Prisma AIRS custom topic guardrail generator with iterative, self-improving refinement.**

Named after Dr. Richard Daystrom's self-learning M-5 multitronic unit from Star Trek — a system designed to improve itself through experience. Daystrom generates, tests, evaluates, and refines Palo Alto Prisma AIRS custom topic guardrails in an autonomous loop, learning from each run to produce better results over time.

## What It Does

1. **Generates** custom topic definitions (name, description, examples) via LLM
2. **Deploys** topics to a Prisma AIRS security profile
3. **Tests** with generated positive/negative prompts via the AIRS scan API
4. **Evaluates** TPR, TNR, accuracy, coverage, and F1 metrics
5. **Analyzes** false positives/negatives with LLM-driven reasoning
6. **Improves** the topic iteratively until coverage target is met
7. **Learns** from each run, persisting insights for future sessions

## Quick Start

```bash
# Install
pnpm install

# Configure
cp .env.example .env
# Edit .env with your API keys

# Run interactively
pnpm run generate

# Run non-interactively
pnpm run generate \
  --provider claude-api \
  --profile my-security-profile \
  --topic "Block discussions about building explosives" \
  --intent block \
  --target-coverage 90
```

## Commands

| Command | Description |
|---------|-------------|
| `guardrail-gen generate` | Start a new guardrail generation loop |
| `guardrail-gen resume <runId>` | Resume a paused or failed run |
| `guardrail-gen report <runId>` | View detailed results for a saved run |
| `guardrail-gen list` | List all saved runs |

## Documentation

- [Installation](docs/INSTALL.md) — prerequisites, setup, configuration
- [Architecture](docs/ARCHITECTURE.md) — system design and module overview
- [Workflow](docs/WORKFLOW.md) — how the iterative loop works
- [Features](docs/FEATURES.md) — capabilities and configuration reference

## Tech Stack

- TypeScript ESM, Node.js 20+
- LangChain.js (Claude, Gemini, Bedrock)
- Prisma AIRS SDK (`@cdot65/prisma-airs-sdk`)
- Vitest, Biome, Commander.js, Zod

## License

MIT
