# Release Notes

## v1.1.1

### Bug Fixes

- **Fix allow-intent detection (P0)**: The v1.1.0 `action === 'allow'` heuristic was wrong — AIRS returns `action: 'allow'` for all prompts on allow topics. Detection now uses the `category` field (`'benign'` = topic matched, `'malicious'` = no match), with fallback to `triggered` when `category` is absent.
- **Fix profile guardrail-level action**: `topic-guardrails` entry in security profiles now always uses `action: 'block'` to enforce violations. Previously defaulted to `'allow'`, causing all topic guardrails to be unenforced.

### Features

- **`--debug-scans` flag**: Dumps raw AIRS scan responses to a JSONL file (`~/.daystrom/debug-scans-*.jsonl`) for offline inspection. Available on both `generate` and `resume` commands.
- **Scanner extracts `category`**: The `category` field from AIRS responses is now included in `ScanResult`.

### Tests

- 217 tests across 17 spec files (up from 209)

## v1.1.0

### Bug Fixes

- **Fix allow-intent detection (P0)**: AIRS never sets `triggered: true` for allow-intent topics — the loop now derives detection from the `action` field (`action === 'allow'` = topic matched). This fixes 0% TPR on all allow guardrails.

### Features

- **Intent-aware refinement**: `analyzeResults()` and `improveTopic()` now receive the guardrail intent (`block`/`allow`), enabling the LLM to prioritize the correct error type during refinement — FN reduction for block guardrails, FP reduction for allow guardrails
- **Intent-specific test generation**: test prompts now use different strategies and category taxonomies for block vs allow guardrails, with asymmetric ratios (~15 positive / ~25 negative for allow)
- **Variable example count (2-5)**: LLM now varies example count between iterations to find optimal configuration. Memory system tracks example count correlation with efficacy.
- **Test accumulation**: new `--accumulate-tests` flag carries test prompts forward across iterations with case-insensitive deduplication for regression detection
- **Max accumulated tests cap**: `--max-accumulated-tests <n>` limits growth of accumulated test pool
- **`tests:accumulated` event**: new loop event reports new/total/dropped test counts when accumulation is active

### Tests

- 209 tests across 17 spec files (up from 192)

## v1.0.8

### Documentation

- Sync remaining docs pages with v1.0.7 changes: fix event table in design-decisions.md, add `format:check` to contributing.md and local-setup.md

## v1.0.7

### Dependencies

- Bump `@cdot65/prisma-airs-sdk` from `^0.2.0` to `^0.4.0` -- adds Model Security, Red Team domains, typed enums, JSDoc, shared retry logic (backward compatible)

### CI

- Add explicit `format:check` step to CI workflow to catch formatting violations in PRs

### Documentation

- Fix inaccurate `LoopEvent` documentation in `CLAUDE.md` and `docs/architecture/core-loop.md`
- Remove unused env vars (`CLOUD_ML_REGION`, `ANTHROPIC_VERTEX_PROJECT_ID`, `PANW_AI_SEC_API_TOKEN`, `PANW_AI_SEC_PROFILE_NAME`) from `.env.example` and reference docs
- Add JSDoc/TSDoc to all 36+ exported symbols across the public API

### Code Quality

- Extract shared `byteLen()` utility from `constraints.ts`, remove duplicate in `service.ts`
- Remove deprecated `MAX_EXAMPLES_COUNT` constant

## v1.0.0

First stable release of Daystrom.

### Highlights

- **Core iterative refinement loop** with async generator architecture
- **6 LLM providers**: Claude (API, Vertex, Bedrock) and Gemini (API, Vertex, Bedrock)
- **Cross-run learning memory** with keyword categorization and budget-aware prompt injection
- **AIRS integration** -- topic CRUD via Management API, batch scanning via Scan API
- **4 CLI commands**: `generate`, `resume`, `report`, `list`
- **Automatic topic constraint clamping** for AIRS limits
- **Comprehensive metrics**: TPR, TNR, coverage, accuracy, F1
- **Resumable runs** with full state persistence
- **192 tests** across 17 spec files
- **Full documentation site** at [cdot65.github.io/daystrom](https://cdot65.github.io/daystrom/)
- **Docker support** with multi-arch images (amd64 + arm64)

## v0.1.0 -- Initial Release

The first public release of Daystrom: an automated CLI for generating, testing, and iteratively refining Palo Alto Prisma AIRS custom topic guardrails.

### Highlights

- **Core iterative refinement loop** with async generator architecture (`runLoop()` yields typed `LoopEvent` discriminated unions)
- **6 LLM providers** supported: Claude (API, Vertex, Bedrock) and Gemini (API, Vertex, Bedrock)
- **Cross-run learning memory** with keyword categorization and budget-aware prompt injection
- **AIRS integration** -- topic CRUD via Management API, batch scanning via Scan API
- **4 CLI commands**: `generate`, `resume`, `report`, `list`
- **Automatic topic constraint clamping** for AIRS limits (100 char name, 250 char description, 250 char/example, 5 examples max, 1000 char combined)
- **Comprehensive metrics**: TPR, TNR, coverage, accuracy, F1
- **Resumable runs** with full state persistence to `~/.daystrom/runs/`
- **165+ tests** with ~98% statement coverage

### Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| AsyncGenerator loop | Enables streaming events to CLI renderer, pause/resume, and decoupled orchestration |
| Structured LLM output (Zod) | Guarantees type-safe topic definitions with automatic retry on parse failure |
| MSW for test mocking | Fully offline test suite, no AIRS credentials needed |
| File-based memory | Simple persistence, no database dependency, human-readable JSON |
