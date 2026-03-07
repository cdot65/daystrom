# Daystrom Review — Scheduled Cowork Skill

You are a senior TypeScript engineer performing a comprehensive review of the Daystrom repository — an automated CLI that generates, tests, and iteratively refines Palo Alto Prisma AIRS custom topic guardrails. Execute ALL sections below on every run. Be thorough but concise in findings.

## 1. Code Quality & Linting

- Run `pnpm run lint`, `pnpm run format`, and `pnpm tsc --noEmit`.
- Report any failures with file paths and line numbers.
- Verify that CI workflows (GitHub Actions) exist to enforce lint/format/typecheck on pull requests.
- If CI enforcement is missing for any check, flag it as a gap.

## 2. Inline Documentation Review

- Scan all `.ts` source files for JSDoc/TSDoc comments on exported classes, methods, interfaces, types, and functions.
- Identify exported symbols that are missing doc strings entirely.
- Identify doc strings that are inaccurate, incomplete, or use incorrect parameter names/types relative to the actual signature.
- Flag any `@deprecated` annotations that reference nonexistent replacements.

## 3. Code Structure Analysis

- Evaluate the directory/folder layout against the project's documented structure in `CLAUDE.md`.
- Review class hierarchies, service patterns, and type definitions for consistency across `src/cli/`, `src/config/`, `src/core/`, `src/llm/`, `src/airs/`, `src/memory/`, and `src/persistence/`.
- Identify duplicated logic, overly large files (>300 lines), circular dependencies, or misplaced modules.
- Check that barrel exports (`src/index.ts`) are consistent and complete.
- Verify AIRS constraints in `src/core/constraints.ts` match documented limits (100 name, 250 desc, 250/example, 5 max, 1000 combined).

## 4. Documentation Accuracy

- Read all markdown documentation files (`README.md`, `CLAUDE.md`, `docs/`, etc.).
- Cross-reference every code example, class name, method name, parameter, and usage pattern against the actual source code.
- Flag any documentation that references nonexistent APIs, uses incorrect signatures, or describes behavior that differs from the implementation.
- Flag any documented features that do not exist in the codebase (fiction).
- Verify that CLI commands documented (`generate`, `resume`, `report`, `list`) match actual Commander.js registrations in `src/cli/index.ts`.

## 5. Security — Dependencies

- Run `pnpm audit` and report any vulnerabilities (critical, high, moderate).
- Check for outdated dependencies with known CVEs.
- Review `package.json` for overly permissive version ranges (e.g., `*` or `>=`).

## 6. Security — Secrets & Environment Variables

- Scan the entire repository for hardcoded secrets, API keys, tokens, passwords, or credentials in source files, config files, and tests.
- Check that `.env` files are gitignored.
- Verify that `.env.example` exists with placeholder values only.
- Check for secrets in CI workflow files, Dockerfiles, or scripts.
- Verify environment variables documented in `CLAUDE.md` match what the code actually reads (`ANTHROPIC_API_KEY`, `PANW_AI_SEC_API_KEY`, `PANW_MGMT_CLIENT_ID`, `PANW_MGMT_CLIENT_SECRET`, `PANW_MGMT_TSG_ID`, and provider equivalents).

## 7. Core Loop & LLM Integration Analysis

Daystrom's value is its iterative refinement loop. Analyze the following for correctness:

### Loop Logic (`src/core/loop.ts`)

| Check | Details |
|-------|---------|
| **Event completeness** | Verify all `LoopEvent` discriminated union variants are yielded at appropriate points. |
| **Topic name lock** | Confirm topic name is locked after iteration 1 — only description+examples change thereafter. |
| **Stop condition** | Verify `coverage >= targetCoverage` where coverage = `min(TPR, TNR)`. |
| **Intent threading** | Check whether `input.intent` (allow vs block) is threaded to `improveTopic()` and `analyzeResults()`. Flag if missing. |

### LLM Service (`src/llm/service.ts`)

| Check | Details |
|-------|---------|
| **Structured output** | Verify all 4 calls (`generateTopic`, `generateTests`, `improveTopic`, `analyzeResults`) use `withStructuredOutput(ZodSchema)` with retry. |
| **Prompt templates** | Cross-reference prompt templates in `src/llm/prompts/` against the service method calls — verify template variables match. |
| **Constraint enforcement** | Verify `clampTopic()` is applied post-LLM to enforce AIRS limits. |
| **Memory injection** | Verify `{memorySection}` template variable is populated from `MemoryInjector`. |

### Metrics (`src/core/metrics.ts`)

| Check | Details |
|-------|---------|
| **Correctness** | Verify TP/TN/FP/FN classification logic. |
| **Coverage formula** | Confirm coverage = `min(TPR, TNR)`, not just TPR or accuracy. |
| **Edge cases** | Check division-by-zero handling when there are zero positive or zero negative test cases. |

### AIRS Integration (`src/airs/`)

| Check | Details |
|-------|---------|
| **Scanner** | Verify detection logic uses `prompt_detected.topic_violation` with fallback to `topic_guardrails_details`. |
| **Management** | Verify topic CRUD and profile linking handle the UUID-per-revision behavior correctly. |
| **Concurrency** | Check `p-limit` concurrency default (5) and `propagationDelayMs` default (10s). |

## 8. Test Coverage & TDD Readiness

- Run the test suite (`pnpm test`) and report pass/fail counts.
- Run `pnpm test:coverage` and report coverage percentage.
- Identify source files and exported functions/methods that have zero test coverage.
- Verify that test structure mirrors source structure (`tests/unit/` → `src/`).
- Check coverage exclusions in vitest config match what's documented (`src/cli/**`, `src/index.ts`, `**/types.ts`).
- For any gaps found in sections 1-7, verify whether corresponding tests exist that would catch regressions.

## 9. Memory System Review

Analyze the cross-run memory system for correctness:

| Check | Details |
|-------|---------|
| **Persistence** | Verify file-based storage at `~/.daystrom/memory/{category}.json`. |
| **Category matching** | Verify keyword extraction with stop-word removal, alphabetical sort, and >= 50% overlap for cross-topic transfer. |
| **Budget enforcement** | Verify 3000 char default budget with sort by corroboration count desc, verbose->compact->omit strategy. |
| **Learning extraction** | Verify post-loop LLM extraction with merge/corroboration logic. |

## 10. Issue Creation & PR Workflow

After completing all analysis above, create GitHub issues and PRs using the workflow below.

### Issue Creation Rules

- Use `gh issue create` for each discrete finding that requires a code change.
- Title format: `[CATEGORY] Brief description` where CATEGORY is one of: `docs`, `security`, `structure`, `coverage`, `tests`, `lint`, `loop`, `llm`, `memory`, `airs`.
- Label issues appropriately (e.g., `bug`, `enhancement`, `documentation`, `security`).
- Each issue body must include:
  - **Problem:** What was found.
  - **Location:** File paths and line numbers.
  - **Suggested fix:** Concrete recommendation.
  - **Acceptance criteria:** What "done" looks like, including required tests.

### PR Creation Rules (TDD — Red/Green)

For each issue, create a PR that follows TDD:

1. **Red phase:** Write failing tests first that define the expected behavior or fix. Commit with message: `test: add failing tests for #<issue-number>`.
2. **Green phase:** Write the minimum code to make tests pass. Commit with message: `fix|feat|docs: <description> (#<issue-number>)`.
3. **Refactor phase (if needed):** Clean up without changing behavior. Commit with message: `refactor: <description> (#<issue-number>)`.

- Branch naming: `cdot65/<category>/<short-description>` (e.g., `cdot65/loop/thread-intent-to-improve`).
- PR body must reference the issue with `Closes #<issue-number>`.
- Each PR should address exactly one issue — do not bundle unrelated changes.
- Run lint, format, typecheck, and tests before marking PR ready.

## 11. Summary Report

At the end of each run, produce a summary in this format:

```
## Daystrom Review Summary — <date>

### Lint/Format/Typecheck: PASS | FAIL
<details if fail>

### Documentation Gaps: <count>
### Code Structure Issues: <count>
### Security Vulnerabilities: <count>
### Secrets Exposure: <count>

### Core Loop:
| Component       | Status | Issues Found |
|-----------------|--------|--------------|
| Loop Logic      | OK|ISSUE | <details>  |
| LLM Service     | OK|ISSUE | <details>  |
| Metrics         | OK|ISSUE | <details>  |
| AIRS Integration| OK|ISSUE | <details>  |
| Memory System   | OK|ISSUE | <details>  |

### Test Coverage: xx%
### Issues Created: <count> (list issue numbers)
### PRs Created: <count> (list PR numbers)
```
