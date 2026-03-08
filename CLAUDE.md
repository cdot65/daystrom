# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

Daystrom is an automated CLI that generates, tests, and iteratively refines **Palo Alto Prisma AIRS custom topic guardrails**. Uses an LLM to produce topic definitions (name, description, examples), deploys to Prisma AIRS, scans test prompts, evaluates efficacy (TPR, TNR, coverage, F1), and improves in a loop until a coverage target is met. Cross-run memory persists learnings for future runs.

## Commands

```bash
# Dev
pnpm install               # Install deps
pnpm run build             # tsc compile to dist/
pnpm run dev               # Run CLI via tsx (any subcommand)
pnpm run generate          # Interactive guardrail generation loop

# Test
pnpm test                  # All tests (vitest run)
pnpm test:watch            # Watch mode
pnpm test -- tests/unit/core/metrics.spec.ts   # Single file
pnpm test -- -t "pattern"  # Tests matching name pattern
pnpm test:coverage         # Coverage (excludes src/cli/**, src/index.ts, **/types.ts)
pnpm test:e2e              # E2E tests (requires real creds, opt-in)

# Lint & Format
pnpm run lint              # Biome check
pnpm run lint:fix          # Biome check --write
pnpm run format            # Biome format --write
pnpm run format:check      # Biome format (check only, no write)

# Type-check
pnpm tsc --noEmit
```

## Tech Stack

TypeScript ESM, Node 20+, pnpm. LangChain.js w/ structured output (Zod). `@cdot65/prisma-airs-sdk` for AIRS scan+management APIs. Commander.js CLI, Inquirer prompts, Chalk rendering. Vitest+MSW tests. Biome lint/format.

## Directory Structure

```
src/
├── cli/                   # CLI entry, 4 commands, interactive prompts, renderer
│   ├── index.ts           # Commander program — registers generate/resume/report/list
│   ├── commands/
│   │   ├── generate.ts    # Main loop orchestration, wires all services
│   │   ├── resume.ts      # Resume paused/failed run from disk
│   │   ├── report.ts      # View run results by ID
│   │   └── list.ts        # List all saved runs
│   ├── prompts.ts         # Inquirer interactive input collection
│   └── renderer.ts        # Terminal output (chalk)
├── config/
│   ├── schema.ts          # Zod ConfigSchema — all config fields w/ defaults
│   └── loader.ts          # Config cascade: CLI > env > file > Zod defaults
├── core/
│   ├── loop.ts            # AsyncGenerator main loop — yields LoopEvent
│   ├── types.ts           # CustomTopic, UserInput, TestCase, TestResult, EfficacyMetrics, AnalysisReport, IterationResult, RunState, LoopEvent
│   ├── metrics.ts         # computeMetrics() — TP/TN/FP/FN → TPR/TNR/accuracy/coverage/F1
│   └── constraints.ts     # AIRS topic limits: 100 name, 250 desc, 250/example, 5 max, 1000 combined
├── llm/
│   ├── provider.ts        # createLlmProvider() — factory for 6 LangChain providers
│   ├── service.ts         # LangChainLlmService — generateTopic, generateTests, improveTopic, analyzeResults
│   ├── schemas.ts         # Zod output schemas for structured LLM responses
│   └── prompts/           # ChatPromptTemplate definitions (4 files)
├── airs/
│   ├── scanner.ts         # AirsScanService — syncScan + scanBatch w/ p-limit concurrency
│   ├── management.ts      # SdkManagementService — topic CRUD + profile linking
│   └── types.ts           # ScanResult, ScanService, ManagementService interfaces
├── memory/
│   ├── store.ts           # MemoryStore — file-based persistence, keyword category matching (≥50% overlap)
│   ├── extractor.ts       # LearningExtractor — post-loop LLM extraction, merge/corroboration
│   ├── injector.ts        # MemoryInjector — budget-aware prompt injection (3000 char default)
│   ├── diff.ts            # computeIterationDiff() — metric deltas between iterations
│   ├── types.ts           # Learning, TopicMemory, IterationDiff
│   ├── schemas.ts         # LearningExtractionOutputSchema
│   └── prompts/
│       └── extract-learnings.ts
├── persistence/
│   ├── store.ts           # JsonFileStore — save/load/list RunState as JSON
│   └── types.ts           # RunStore, RunStateSummary
└── index.ts               # Library exports

tests/
├── unit/                  # 16 spec files
│   ├── airs/              # scanner.spec.ts, management.spec.ts
│   ├── config/            # schema.spec.ts, loader.spec.ts
│   ├── core/              # loop.spec.ts, metrics.spec.ts, constraints.spec.ts
│   ├── llm/               # provider.spec.ts, schemas.spec.ts, service.spec.ts, prompts.spec.ts
│   ├── memory/            # store.spec.ts, extractor.spec.ts, injector.spec.ts, diff.spec.ts
│   └── persistence/       # store.spec.ts
├── integration/           # loop.integration.spec.ts (full loop w/ mocks)
├── e2e/                   # vertex-provider.e2e.spec.ts (opt-in, requires real creds)
└── helpers/               # mocks.ts
```

## Architecture

### Core Loop (`src/core/loop.ts`)
- `runLoop()` async generator yields typed `LoopEvent` discriminated unions
- Events yielded by `runLoop()`: `iteration:start`, `generate:complete`, `apply:complete`, `test:progress`, `evaluate:complete`, `analyze:complete`, `iteration:complete`, `memory:extracted` (if memory enabled), `loop:complete`
- Events defined in `LoopEvent` union but **not yielded** by `runLoop()`: `loop:paused` (reserved for future use), `memory:loaded` (emitted by CLI before loop starts)
- `apply:complete` is yielded but intentionally unhandled in CLI commands (no user-facing output needed)
- Topic name **locked after iteration 1** — only description+examples change thereafter
- Stop: `coverage >= targetCoverage` (default 0.9). Coverage = `min(TPR, TNR)`

### AIRS Integration (`src/airs/`)
- **Scanner**: `Scanner.syncScan()` via SDK, detection = `prompt_detected.topic_violation` (fallback: `topic_guardrails_details`)
- **Management**: `ManagementClient` for topic CRUD + profile linking via OAuth2
- Profile updates create **new revisions with new UUIDs** — always reference profiles by name, never ID
- Topics must be added to profile's `model-protection` → `topic-guardrails` → `topic-list`
- Topics can't be deleted while referenced by any profile revision

### LLM Service (`src/llm/`)
- 6 providers: `claude-api` (default), `claude-vertex`, `claude-bedrock`, `gemini-api`, `gemini-vertex`, `gemini-bedrock`
- Default model: `claude-opus-4-6` (Vertex: `claude-opus-4-6`, Bedrock: `anthropic.claude-opus-4-6-v1`)
- `claude-vertex` default region: `global` (not `us-central1`)
- All 4 calls use `withStructuredOutput(ZodSchema)` — 3 retries on parse failure
- Memory injected via `{memorySection}` template variable
- `clampTopic()` enforces AIRS constraints post-LLM (not Zod) — drops examples, trims description

### Memory System (`src/memory/`)
- File-based at `~/.daystrom/memory/{category}.json`
- Category = normalized keyword extraction (stop-word removal, alphabetical sort)
- Cross-topic transfer when keyword overlap ≥ 50%
- Budget-aware injection (3000 char default): sorts by corroboration count desc, verbose→compact→omit

### Config (`src/config/`)
- Priority: CLI flags > env vars > `~/.daystrom/config.json` > Zod defaults
- All fields in `ConfigSchema` with coercion + defaults; `~` expanded via `expandHome()`

### Persistence (`src/persistence/`)
- `JsonFileStore` saves/loads `RunState` as JSON at `~/.daystrom/runs/{runId}.json`

## AIRS Constraints (`src/core/constraints.ts`)

- Topic name: 100 chars max
- Description: 250 chars max
- Each example: 250 chars max, 5 examples max
- Combined (desc + all examples): 1000 chars max

## Critical Details

- `propagationDelayMs` default 10s — AIRS needs propagation time after topic create/update
- `scanConcurrency` default 5 — higher risks rate limiting
- LLM description output routinely exceeds 250 char AIRS limit — `clampTopic()` handles this

## Environment Variables

See `.env.example`. Required: `ANTHROPIC_API_KEY` (or provider equivalent), `PANW_AI_SEC_API_KEY`, `PANW_MGMT_CLIENT_ID`, `PANW_MGMT_CLIENT_SECRET`, `PANW_MGMT_TSG_ID`.
