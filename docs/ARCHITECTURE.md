# Architecture

## Module Overview

```
src/
├── cli/              CLI entry point, commands, prompts, terminal rendering
├── config/           Zod-validated config with env/file/CLI cascade
├── core/             Main loop (async generator), metrics, topic constraints
├── llm/              LangChain provider factory, structured output service, prompt templates
├── airs/             Scanner (scan API) and Management (SDK v2 CRUD) services
├── memory/           Learning store, extractor, injector, diff computation
└── persistence/      JSON file store for run state
```

## Data Flow

```
User Input
    │
    ▼
┌──────────────────────────────┐
│        Core Loop             │
│   (async generator)          │
│                              │
│  ┌─────┐    ┌──────────┐    │
│  │ LLM │◄──►│  Memory   │    │
│  │     │    │ Injector  │    │
│  └──┬──┘    └──────────┘    │
│     │                        │
│     ▼                        │
│  Generate/Improve Topic      │
│     │                        │
│     ▼                        │
│  ┌─────────────┐            │
│  │ Management   │            │
│  │ (SDK v2)     │            │
│  └──────┬──────┘            │
│         │ create/update      │
│         ▼                    │
│  ┌─────────────┐            │
│  │  Scanner     │            │
│  │  (Scan API)  │            │
│  └──────┬──────┘            │
│         │ batch scan         │
│         ▼                    │
│  Evaluate Metrics            │
│     │                        │
│     ▼                        │
│  LLM Analyze FP/FN          │
│     │                        │
│     ▼                        │
│  coverage ≥ target? ─► exit  │
└──────────────────────────────┘
    │
    ▼
Extract Learnings → Memory Store
Persist RunState → JSON File
```

## Key Design Decisions

**Async Generator Loop** — The core loop yields typed events (`LoopEvent`) rather than calling renderers directly. This decouples the engine from the UI and makes the loop fully testable with mock event consumers.

**Budget-Aware Memory Injection** — Learnings are injected into LLM prompts with a character budget (default 3000). High-corroboration learnings get verbose format; overflow learnings get compact format; the rest are omitted with a count notice.

**Config Cascade** — CLI flags override env vars override config file override Zod defaults. All validation happens through a single Zod schema parse.

**Topic Constraints** — AIRS enforces hard limits (100 char name, 250 char description, 250 char per example, 1000 chars combined). A constraint layer validates and clamps before API calls.

**Category-Based Memory** — Topics are categorized by normalized keyword extraction. Relevance matching uses keyword overlap (≥50% threshold) so learnings from similar topics transfer across runs.

## Module Details

### `core/loop.ts`
The async generator orchestrating iterations. Each iteration: generate/improve → apply → wait → test → evaluate → analyze → record. Yields events at each stage for UI rendering.

### `llm/service.ts`
Wraps LangChain with structured output (Zod schemas). Four main operations: `generateTopic`, `generateTests`, `improveTopic`, `analyzeResults`. Memory section is injected into system prompts when available.

### `airs/management.ts`
SDK v2 client for CRUD operations on custom topics and security profile linking. Topics must be explicitly assigned to a profile's `model-protection` → `topic-guardrails` → `topic-list`.

### `airs/scanner.ts`
Batch scanning with `p-limit` concurrency control. Each test prompt is scanned and checked for `prompt_detected.topic_violation`.

### `memory/extractor.ts`
Post-loop LLM call that extracts actionable learnings from iteration diffs. Merges new insights with existing memory, incrementing corroboration counts for repeated observations.

### `memory/store.ts`
File-based persistence keyed by normalized topic category. Stop-word removal + alphabetical sort produces stable category keys.
