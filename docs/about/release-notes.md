# Release Notes

## v1.7.2

### Features

- **`daystrom model-security` command group**: Full AI Model Security operations — security groups CRUD, rule browsing, rule instance configuration, scan operations (create/list/get), evaluations, violations, files, label management, and PyPI authentication.
- **`SdkModelSecurityService`**: New service wrapping `ModelSecurityClient` with camelCase normalization for all 23 SDK methods.
- **5 subcommand groups**: `groups` (list/get/create/update/delete), `rules` (list/get), `rule-instances` (list/get/update), `scans` (list/get/create/evaluations/violations/files), `labels` (add/set/delete/keys/values), plus `pypi-auth`.
- **SDK upgrade**: `@cdot65/prisma-airs-sdk` v0.6.0 → v0.6.1 — fixed list filter options for groups, rules, and rule instances.

### Tests

- 390 tests across 25 spec files (up from 360)

## v1.7.0

### Features

- **Red team target CRUD**: Full target lifecycle management — `create`, `get`, `update`, `delete` via CLI (`daystrom redteam targets <subcommand>`) and library API (`SdkRedTeamService`).
- **Target connection validation**: `--validate` flag on `targets create` and `targets update` validates connectivity before saving (SDK v0.6.0 `TargetOperationOptions`).
- **Target probe**: `daystrom redteam targets probe --config conn.json` tests a target connection without persisting.
- **Target profile management**: `targets profile <uuid>` and `targets update-profile <uuid>` for target profiling configuration.
- **Prompt set full CRUD**: `get`, `update`, `archive`/unarchive, `version-info`, CSV template download via `daystrom redteam prompt-sets <subcommand>`.
- **CSV prompt upload**: `daystrom redteam prompt-sets upload <uuid> file.csv` for bulk prompt ingestion (SDK v0.6.0 `uploadPromptsCsv()`).
- **Individual prompt CRUD**: `list`, `get`, `add`, `update`, `delete` prompts within sets via `daystrom redteam prompts <subcommand>`.
- **Property management**: `daystrom redteam properties {list,create,values,add-value}` for custom attack property names and values.
- **SDK upgrade**: `@cdot65/prisma-airs-sdk` v0.4.0 → v0.6.0 — fully typed target schemas (connection params, background, metadata, additional context), no breaking changes.

### CLI Changes

Existing flat commands refactored to subcommand groups:

| Before (v1.6.0) | After (v1.7.0) |
|-----------------|----------------|
| `daystrom redteam targets` | `daystrom redteam targets list` |
| `daystrom redteam prompt-sets` | `daystrom redteam prompt-sets list` |
| — | `daystrom redteam targets {get,create,update,delete,probe,profile,update-profile}` |
| — | `daystrom redteam prompt-sets {get,create,update,archive,download,upload}` |
| — | `daystrom redteam prompts {list,get,add,update,delete}` |
| — | `daystrom redteam properties {list,create,values,add-value}` |

### Tests

- 360 tests across 24 spec files (up from 333)
- 100% coverage on `redteam.ts` and `promptsets.ts`

## v1.6.0

### Features

- **`daystrom audit <profileName>`**: New command evaluates all topics in an AIRS security profile. Generates tests per topic, scans them, computes per-topic and composite metrics (TPR, TNR, coverage, accuracy, F1), and detects cross-topic conflicts.
- **Per-topic metrics**: Each topic gets its own efficacy breakdown, enabling identification of weak guardrails within a profile.
- **Conflict detection**: Identifies cross-topic interference — prompts that are false negatives for one topic and false positives for another.
- **Audit reports**: `--format json` and `--format html` export audit results with per-topic metrics tables, conflict sections, and composite scores.
- **`getProfileTopics()`**: New `ManagementService` method extracts enriched topic entries from profile policy structure.
- **`TestCase.targetTopic`**: New optional field for audit topic attribution (backward-compatible with existing loop).

### Tests

- 333 tests across 24 spec files (up from 298)

## v1.5.0

### Features

- **Structured evaluation reports**: `daystrom report` now supports `--format json` and `--format html` for machine-readable and shareable report export.
- **Per-test-case details**: `--tests` flag includes individual test results (prompt, expected/actual outcome, pass/fail, category, source) in all output formats.
- **Run comparison**: `--diff <runId>` compares two runs side-by-side with metric deltas (coverage, TPR, TNR, accuracy, F1).
- **Self-contained HTML reports**: HTML output includes embedded CSS with run summary, iteration trends, metrics tables, test result tables, and diff sections. No external dependencies.
- **JSON export**: Clean structured JSON to stdout for CI/CD pipelines and programmatic consumption.
- **New report module**: `buildReportJson()` and `buildReportHtml()` exported as library functions for custom integrations.

### Tests

- 298 tests across 21 spec files (up from 272)

## v1.4.0

### Features

- **Carry forward failures**: FP and FN test cases from each iteration are automatically carried into the next iteration's test suite. Failed tests are re-scanned to verify whether topic refinement fixed them.
- **Regression tier**: TP and TN (correct) test cases from the previous iteration are re-scanned as regression tests. If a previously-correct test now fails after topic refinement, it's counted as a regression.
- **Weighted category generation**: Per-category error rates from the previous iteration are passed to the LLM test generator, which produces proportionally more tests for high-error categories.
- **`tests:composed` event**: New loop event reports test composition breakdown (generated, carried failures, regression tier, total) on iterations 2+.
- **`regressionCount` metric**: `EfficacyMetrics` now includes the count of regression-tier tests that failed.
- **`CategoryBreakdown` type**: New exported type for per-category FP/FN/error-rate breakdown.
- **`computeCategoryBreakdown()` helper**: New exported function to compute per-category error rates from test results.
- **Test source tagging**: `TestCase.source` field tracks how each test entered the suite (`'generated'`, `'carried-fp'`, `'carried-fn'`, `'regression'`).

### Tests

- 272 tests across 19 spec files (up from 265)

## v1.3.1

### Documentation

- **End-to-end example workflow**: New Examples section with a complete guardrail-to-red-team walkthrough — generate a topic guardrail, export prompts as a custom prompt set, launch a CUSTOM red team scan, monitor status, and review per-prompt results. All output captured from a real AIRS run.

## v1.3.0

### Bug Fixes

- **Fix custom scan payload**: AIRS API expects `custom_prompt_sets` as an array of UUID strings, not objects. `createScan()` was wrapping each UUID in `{ uuid }`, causing 422 validation errors on all CUSTOM scan requests.
- **Fix ASR display**: AIRS API returns ASR/score/threatRate as percentages (0-100), not ratios (0-1). Renderer was multiplying by 100, showing e.g. 1250% instead of 12.5%.

### Features

- **Custom attack list in reports**: `daystrom redteam report <jobId> --attacks` now shows prompt-level results for CUSTOM scans — prompt text, goal, threat status, and per-prompt ASR.

### Tests

- 258 tests across 19 spec files (up from 255)

### Documentation

- Updated red team CLI examples with real-world usage patterns
- Added tip for finding prompt set UUIDs

## v1.2.0

### Features

- **`daystrom redteam` command group**: Full AI Red Team scan operations — launch static/dynamic/custom scans, poll for completion, view reports with severity breakdowns and attack details, list targets and categories, abort running scans.
- **`SdkRedTeamService`**: New service wrapping `RedTeamClient` for programmatic red team operations. Normalizes all SDK responses into clean TypeScript interfaces.
- **7 subcommands**: `scan`, `status`, `report`, `list`, `targets`, `categories`, `abort`.

### Tests

- 255 tests across 19 spec files (up from 230), 100% coverage on new code.

## v1.1.2

### Bug Fixes

- **Fix profile topic-list payload**: AIRS rejects empty `topic-list` entries. The `assignTopicToProfile` method was sending two entries (one for the action, one empty for the opposite), causing a 400 error on profile update. Now sends a single entry containing only the active topic. Also removed unnecessary `revision` field from topic entries.

## v1.1.1

### Bug Fixes

- **Fix allow-intent detection (P0)**: The v1.1.0 `action === 'allow'` heuristic was wrong — AIRS returns `action: 'allow'` for all prompts on allow topics. Detection now uses the `category` field (`'benign'` = topic matched, `'malicious'` = no match), with fallback to `triggered` when `category` is absent.
- **Fix profile guardrail-level action**: `topic-guardrails` entry in security profiles now always uses `action: 'block'` to enforce violations. Previously defaulted to `'allow'`, causing all topic guardrails to be unenforced.

### Features

- **`--debug-scans` flag**: Dumps raw AIRS scan responses to a JSONL file (`~/.daystrom/debug-scans-*.jsonl`) for offline inspection. Available on both `generate` and `resume` commands.
- **Scanner extracts `category`**: The `category` field from AIRS responses is now included in `ScanResult`.
- **`--create-prompt-set` flag**: Auto-creates a custom prompt set in AI Runtime Security from the best iteration's test cases. Prompts include goals indicating expected guardrail behavior. Available on both `generate` and `resume` commands.
- **`SdkPromptSetService`**: New service wrapping `RedTeamClient.customAttacks` for prompt set CRUD.
- **`promptset:created` event**: New loop event emitted after prompt set creation with set ID, name, and prompt count.

### Tests

- 230 tests across 18 spec files (up from 209)

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
