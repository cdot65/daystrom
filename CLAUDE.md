# CLAUDE.md — Daystrom

## Project Summary

Daystrom is an automated CLI tool that generates, tests, and iteratively refines **Palo Alto Prisma AIRS custom topic guardrails**. It uses an LLM to produce topic definitions (name, description, examples), deploys them to a Prisma AIRS security profile, scans test prompts against the live AIRS API, evaluates efficacy metrics (TPR, TNR, coverage, F1), and improves the topic in a loop until a coverage target is met. A cross-run memory system persists learnings so future runs start with accumulated knowledge.

Named after Dr. Daystrom's self-learning M-5 multitronic unit from Star Trek TOS.

## Tech Stack

- **Runtime:** TypeScript ESM, Node.js 20+, pnpm
- **LLM:** LangChain.js with structured output (Zod schemas)
  - Providers: `claude-api` (default), `claude-vertex`, `claude-bedrock`, `gemini-api`, `gemini-vertex`, `gemini-bedrock`
  - Default model: `claude-sonnet-4-20250514` / `gemini-2.0-flash`
- **AIRS SDK:** `@cdot65/prisma-airs-sdk@^0.2.0` — scan API + management API (OAuth2)
- **CLI:** Commander.js, Inquirer, Chalk
- **Test:** Vitest, MSW (HTTP mocking)
- **Lint/Format:** Biome
- **Validation:** Zod (config schema, LLM output schemas)

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
├── unit/                  # 12 spec files
│   ├── airs/              # scanner.spec.ts, management.spec.ts
│   ├── core/              # loop.spec.ts, metrics.spec.ts, constraints.spec.ts
│   ├── llm/               # provider.spec.ts, schemas.spec.ts
│   ├── memory/            # store.spec.ts, extractor.spec.ts, injector.spec.ts, diff.spec.ts
│   └── persistence/       # store.spec.ts
├── integration/           # loop.integration.spec.ts (full loop w/ mocks)
└── helpers/               # mocks.ts
```

## Key Architectural Patterns

### Core Loop (`src/core/loop.ts`)
- `runLoop()` is an **async generator** yielding typed `LoopEvent` discriminated unions
- Events: `iteration:start`, `generate:complete`, `apply:complete`, `test:progress`, `evaluate:complete`, `analyze:complete`, `iteration:complete`, `loop:complete`, `loop:paused`, `memory:loaded`, `memory:extracted`
- Topic name is **locked** after iteration 1 — only description + examples change
- Stop condition: `coverage >= targetCoverage` (default 0.9)

### AIRS Integration
- **Scanner** (`src/airs/scanner.ts`): uses `@cdot65/prisma-airs-sdk` `Scanner.syncScan()`, detection via `prompt_detected.topic_violation` boolean
- **Management** (`src/airs/management.ts`): uses `ManagementClient` for topic CRUD + profile linking
- Profile updates create **new revisions with new UUIDs** — always reference profiles by name, never by ID
- Topics must be explicitly added to profile's `model-protection` → `topic-guardrails` → `topic-list`
- Topics cannot be deleted if any profile revision references them

### Memory System
- **Store** (`src/memory/store.ts`): file-based at `~/.prisma-airs-guardrails/memory/{category}.json`
- Category = normalized keyword extraction (stop-word removal, alphabetical sort)
- Cross-topic transfer when keyword overlap ≥ 50%
- **Extractor** (`src/memory/extractor.ts`): post-loop LLM call, deduplicates by insight string, increments corroboration count
- **Injector** (`src/memory/injector.ts`): budget-aware (default 3000 chars)
  - Sorts by corroborations desc (most validated first)
  - Verbose format: `- [DO/AVOID] {insight} ({changeType}, seen Nx)` while under budget
  - Compact format: `- [DO/AVOID] {insight}` for overflow
  - Omission notice: `(+N more learnings omitted)` if even compact doesn't fit

### LLM Service (`src/llm/service.ts`)
- All 4 LLM calls use `withStructuredOutput(ZodSchema)` for type-safe responses
- Memory section injected into all prompt templates via `{memorySection}` variable
- `clampTopic()` enforces AIRS constraints post-LLM — drops examples, trims description
- 3 retries per LLM call on parse failure

### Config (`src/config/`)
- Priority: CLI flags > env vars > `~/.prisma-airs-guardrails/config.json` > Zod defaults
- All fields defined in `ConfigSchema` with coercion + defaults
- `~` paths expanded via `expandHome()`

## Commands

```bash
pnpm run generate          # Interactive or with CLI flags
pnpm run dev resume <id>   # Resume paused run
pnpm run dev report <id>   # View run report
pnpm run dev list          # List all runs
```

## Testing

```bash
pnpm test                  # 108 tests across 13 files
pnpm test:watch            # Watch mode
pnpm test:coverage         # Coverage (excludes src/cli/**, src/index.ts)
pnpm tsc --noEmit          # Type-check
pnpm run lint              # Biome check
```

## Critical Implementation Details

- LLM description output often exceeds 250 char AIRS limit — `clampTopic()` in `src/llm/service.ts` handles this, not Zod
- Scan detection field: `prompt_detected.topic_violation` (boolean) — also checks `topic_guardrails_details` as fallback
- `propagationDelayMs` default 10s — AIRS needs time after topic create/update before scans reflect changes
- `scanConcurrency` default 5 — too high risks rate limiting
- Coverage metric = `min(TPR, TNR)` — ensures both sensitivity and specificity

## Environment Variables

See `.env.example` for full list. Required:
- `ANTHROPIC_API_KEY` (or equivalent for chosen provider)
- `PANW_AI_SEC_API_KEY` (scan API)
- `PANW_MGMT_CLIENT_ID`, `PANW_MGMT_CLIENT_SECRET`, `PANW_MGMT_TSG_ID` (management API)

## Data Locations

- Runs: `~/.prisma-airs-guardrails/runs/{runId}.json`
- Memory: `~/.prisma-airs-guardrails/memory/{category}.json`
- Config: `~/.prisma-airs-guardrails/config.json`
