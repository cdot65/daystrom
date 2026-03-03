# Architecture

## Module Overview

```
src/
├── cli/              CLI entry point, 4 commands, interactive prompts, terminal rendering
│   ├── index.ts      Commander program — registers generate/resume/report/list commands
│   ├── commands/     Each command wires services and consumes the loop's event stream
│   ├── prompts.ts    Inquirer-based interactive input (topic, intent, profile, seeds, etc.)
│   └── renderer.ts   Chalk-based terminal output for each LoopEvent type
├── config/
│   ├── schema.ts     Zod ConfigSchema — all fields with types, ranges, and defaults
│   └── loader.ts     Cascaded config: CLI flags > env vars > config file > Zod defaults
├── core/
│   ├── loop.ts       runLoop() async generator — orchestrates iterations, yields LoopEvent
│   ├── types.ts      All core types: CustomTopic, UserInput, TestCase, TestResult,
│   │                 EfficacyMetrics, AnalysisReport, IterationResult, RunState, LoopEvent
│   ├── metrics.ts    computeMetrics() — TP/TN/FP/FN counts → TPR/TNR/accuracy/coverage/F1
│   └── constraints.ts  AIRS topic validation + clamping (100/250/250/5/1000 limits)
├── llm/
│   ├── provider.ts   createLlmProvider() — factory producing BaseChatModel for 6 providers
│   ├── service.ts    LangChainLlmService — 4 structured-output operations + memory injection
│   ├── schemas.ts    Zod schemas for LLM output parsing (CustomTopic, TestSuite, AnalysisReport)
│   └── prompts/      ChatPromptTemplate definitions for each LLM operation
├── airs/
│   ├── scanner.ts    AirsScanService — syncScan + scanBatch with p-limit concurrency control
│   ├── management.ts SdkManagementService — topic CRUD + profile topic-guardrails linking
│   └── types.ts      ScanResult, ScanService, ManagementService interfaces
├── memory/
│   ├── store.ts      MemoryStore — file-based persistence, keyword categorization, overlap matching
│   ├── extractor.ts  LearningExtractor — post-loop LLM call, dedup by insight, corroboration merge
│   ├── injector.ts   MemoryInjector — budget-aware injection (verbose → compact → omit)
│   ├── diff.ts       computeIterationDiff() — tracks what changed between iterations
│   ├── types.ts      Learning, TopicMemory, IterationDiff
│   ├── schemas.ts    LearningExtractionOutputSchema for structured LLM extraction
│   └── prompts/      Prompt template for learning extraction
├── persistence/
│   ├── store.ts      JsonFileStore — save/load/list RunState as timestamped JSON files
│   └── types.ts      RunStore, RunStateSummary interfaces
└── index.ts          Library exports (types + services for programmatic use)
```

## Data Flow

```
User Input (topic description, intent, profile name, seeds)
    │
    ▼
┌──────────────────────────────────────────────┐
│               Core Loop                       │
│         (async generator: LoopEvent)          │
│                                              │
│  ┌────────────┐    ┌────────────────────┐    │
│  │    LLM     │◄──►│  Memory Injector   │    │
│  │  Service   │    │  (budget: 3000ch)  │    │
│  └─────┬──────┘    └────────────────────┘    │
│        │                                      │
│        ▼                                      │
│  1. Generate topic (iter 1) or               │
│     Improve topic (iter 2+, name locked)     │
│        │                                      │
│        ▼                                      │
│  ┌─────────────────┐                         │
│  │  Management API  │  create/update topic   │
│  │  (SDK v2 OAuth2) │  + link to profile     │
│  └────────┬────────┘                         │
│           │                                   │
│           ▼                                   │
│  Wait for propagation (default 10s)          │
│           │                                   │
│           ▼                                   │
│  2. Generate test cases (LLM)                │
│     ├── positive tests (should trigger)      │
│     └── negative tests (should not trigger)  │
│           │                                   │
│           ▼                                   │
│  ┌─────────────────┐                         │
│  │   Scanner API    │  batch scan prompts    │
│  │  (p-limit: 5)   │  against live profile  │
│  └────────┬────────┘                         │
│           │                                   │
│           ▼                                   │
│  3. Compute metrics                          │
│     TPR, TNR, accuracy, coverage, F1         │
│           │                                   │
│           ▼                                   │
│  4. LLM analyzes FP/FN patterns              │
│           │                                   │
│           ▼                                   │
│  coverage ≥ target? ──yes──► exit loop       │
│       │ no                                    │
│       └──► next iteration                    │
│                                              │
└──────────────────────────────────────────────┘
    │
    ▼
Post-loop:
  ├── LearningExtractor: extract insights from iteration diffs → merge into memory store
  ├── Persist RunState to ~/.prisma-airs-guardrails/runs/{runId}.json
  └── Yield loop:complete event with best iteration
```

## Key Design Decisions

### Async Generator Loop
The core loop (`runLoop()`) is an async generator that yields typed `LoopEvent` discriminated unions rather than calling renderers directly. This decouples the engine from the UI, making the loop fully testable with mock event consumers. The CLI's `generate` command iterates the generator and dispatches events to the renderer.

### Event Types
11 event types cover the full loop lifecycle:
- `iteration:start`, `generate:complete`, `apply:complete` — setup phase
- `test:progress` — per-test scan completion (for progress bars)
- `evaluate:complete`, `analyze:complete` — metrics + analysis
- `iteration:complete` — full iteration result
- `loop:complete`, `loop:paused` — terminal states
- `memory:loaded`, `memory:extracted` — memory lifecycle

### Topic Name Locking
The topic name generated in iteration 1 is locked for all subsequent iterations. Only the description and examples change. This prevents the loop from thrashing between different topic identities and ensures the AIRS topic entity stays consistent.

### Budget-Aware Memory Injection
Learnings from `~/.prisma-airs-guardrails/memory/` are injected into all LLM prompts. Instead of a hard count cap, a character budget (default 3000, configurable 500–10000 via `MAX_MEMORY_CHARS`) controls section size. High-corroboration learnings get verbose format with metadata; overflow learnings get compact format; the rest are omitted with a count notice. This ensures all learnings are considered without prompt bloat.

### Config Cascade
Priority: CLI flags > env vars > `~/.prisma-airs-guardrails/config.json` > Zod schema defaults. All config passes through a single `ConfigSchema.parse()` call — no separate validation logic. The `~` prefix in paths is expanded to `$HOME` after parsing.

### Topic Constraints & Clamping
AIRS enforces hard limits on topic definitions: 100 chars name, 250 chars description, 250 chars per example, max 5 examples, 1000 chars combined. The LLM frequently exceeds the 250-char description limit. Rather than relying on Zod validation alone, `clampTopic()` in `src/llm/service.ts` truncates fields post-LLM, drops trailing examples if the combined limit is exceeded, and trims the description as a last resort.

### Category-Based Memory
Topics are categorized by normalized keyword extraction: lowercase, strip punctuation, remove stop words, sort alphabetically, join with hyphens. Relevance matching uses keyword overlap ≥50% (relative to the smaller set), so learnings from "block weapons discussions" can benefit a run about "block violence discussions."

## Module Details

### `core/loop.ts`
The async generator orchestrating iterations. Each iteration: generate/improve → create/update topic via management API → wait for propagation → generate tests → batch scan → compute metrics → analyze FP/FN → record iteration. Extracts learnings post-loop if memory is enabled.

### `llm/service.ts`
Wraps LangChain `BaseChatModel` with structured output via Zod schemas. Four operations:
- `generateTopic()` — initial topic from description + intent + optional seeds
- `generateTests()` — balanced positive/negative test cases
- `improveTopic()` — refine based on metrics, analysis, FP/FN details
- `analyzeResults()` — identify FP/FN patterns, suggest improvements

All operations inject the memory section (`{memorySection}` template variable) and retry up to 3 times on parse failure. `clampTopic()` post-processes outputs to fit AIRS constraints.

### `airs/management.ts`
SDK v2 `ManagementClient` wrapper. `assignTopicToProfile()` reads the profile's policy, navigates to `ai-security-profiles[0].model-configuration.model-protection`, finds or creates the `topic-guardrails` entry, and inserts the topic into the appropriate action bucket (`block` or `allow`). This is the most complex AIRS interaction — profile updates create new revisions with new UUIDs.

### `airs/scanner.ts`
Wraps `@cdot65/prisma-airs-sdk` `Scanner.syncScan()`. Detection is determined by `prompt_detected.topic_violation` (boolean) with `topic_guardrails_details` as a fallback. `scanBatch()` uses `p-limit` for concurrency control (default 5 parallel requests).

### `memory/extractor.ts`
Post-loop LLM call that receives formatted iteration history (descriptions, examples, metrics, diffs). Outputs `Learning[]` with insight, strategy, outcome, changeType, tags. Merges into existing category memory: exact-match insights increment corroboration count; new insights are appended. Also tracks `bestKnown` (best topic/metrics across all runs) and anti-patterns.

### `memory/store.ts`
File-based persistence at `~/.prisma-airs-guardrails/memory/{category}.json`. Categories are normalized keyword strings. `findRelevant()` loads all category files and returns those with ≥50% keyword overlap. Simple but effective for the expected scale (dozens of categories, not thousands).

### `memory/injector.ts`
Builds the memory section string for LLM prompts. Sorts learnings by corroboration count descending. Three rendering tiers within a character budget:
1. Verbose: `- [DO/AVOID] {insight} ({changeType}, seen Nx)` — full metadata
2. Compact: `- [DO/AVOID] {insight}` — insight only, when verbose exceeds budget
3. Omitted: `(+N more learnings omitted)` — when even compact doesn't fit

Anti-patterns are appended after learnings if budget allows.

### `persistence/store.ts`
`JsonFileStore` saves `RunState` as pretty-printed JSON to `~/.prisma-airs-guardrails/runs/{runId}.json`. Supports load by ID, list all runs (returns summaries), and save.
