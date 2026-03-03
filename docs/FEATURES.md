# Features

## Core Capabilities

### Iterative Guardrail Refinement
Autonomous loop that generates, tests, evaluates, and improves custom topic definitions until a coverage target is met. Each iteration uses LLM-driven analysis of false positives and false negatives to inform the next improvement. The loop operates against live AIRS infrastructure — topics are deployed to real security profiles and scanned with the production scan API.

The topic name is locked after iteration 1 to maintain identity consistency. Only the description (≤250 chars) and examples (≤250 chars each, max 5, ≤1000 combined) are refined across iterations.

### Multi-Provider LLM Support
Pluggable LLM backend via LangChain.js. All providers use structured output (Zod schemas) and `temperature: 0` for deterministic responses. The LLM is used for 4 distinct operations per iteration: topic generation, test case generation, result analysis, and topic improvement.

| Provider | Config Value | Default Model | Auth |
|----------|-------------|---------------|------|
| Claude API | `claude-api` | `claude-opus-4-6` | `ANTHROPIC_API_KEY` |
| Claude Vertex | `claude-vertex` | `claude-opus-4-6` | GCP project + location (`global` region) |
| Claude Bedrock | `claude-bedrock` | `anthropic.claude-opus-4-6-v1` | AWS credentials |
| Gemini API | `gemini-api` | `gemini-2.0-flash` | `GOOGLE_API_KEY` |
| Gemini Vertex | `gemini-vertex` | `gemini-2.0-flash` | GCP project + location |
| Gemini Bedrock | `gemini-bedrock` | `gemini-2.0-flash` | AWS credentials |

All LLM calls retry up to 3 times on parse failures. Post-LLM output is clamped to fit AIRS constraints via `clampTopic()`.

### Cross-Run Learning Memory
A persistent memory system extracts, stores, and injects learnings across runs:

- **Keyword-based categorization** — topic descriptions are normalized to keyword strings (stop-word removal, alphabetical sort). Example: "Block weapons discussions" → `block-discussions-weapons`
- **Cross-topic transfer** — learnings are injected for topics with ≥50% keyword overlap, enabling knowledge transfer between related topics
- **Corroboration tracking** — when the same insight is independently discovered across runs, its corroboration count increments, signaling higher confidence
- **Budget-aware injection** — all learnings are included in LLM prompts within a character budget (default 3000). High-corroboration learnings get verbose format (with metadata); overflow gets compact format (insight only); the remainder is omitted with a count
- **Anti-pattern tracking** — known failure modes (e.g., "adding exclusion clauses near char limit causes truncation") are persisted and surfaced in prompts
- **Best-known tracking** — the best topic definition and metrics for each category are stored, allowing comparison across runs

Storage: `~/.prisma-airs-guardrails/memory/{category}.json`

### Resumable Runs
Runs can be paused (interrupted) and resumed from the last iteration. The full run state — every iteration's topic, test cases, results, metrics, and analysis — is persisted to disk as JSON. Resume adds additional iterations from the current position.

Storage: `~/.prisma-airs-guardrails/runs/{runId}.json`

### Automated Test Generation
Each iteration generates balanced test suites via LLM:
- **Positive tests** — prompts that *should* trigger the topic guardrail (true violations)
- **Negative tests** — prompts that *should not* trigger (benign content, related but non-violating)

Each test case includes a prompt, expected trigger status, and category label for analysis.

### Batch Scanning with Concurrency Control
Test prompts are scanned against the live AIRS scan API using `p-limit` for concurrency control. Default: 5 parallel requests. Each scan checks `prompt_detected.topic_violation` (with `topic_guardrails_details` as fallback) to determine if the topic guardrail was triggered.

### Comprehensive Metrics
Each iteration computes:
- **TPR** (true positive rate / sensitivity) — what fraction of violation prompts were correctly detected
- **TNR** (true negative rate / specificity) — what fraction of benign prompts were correctly passed
- **Coverage** — `min(TPR, TNR)`, the primary optimization target. Ensures both sensitivity and specificity improve together.
- **Accuracy** — overall correctness across all tests
- **F1** — harmonic mean of precision and recall

### Topic Constraint Enforcement
Automatic validation and clamping to Prisma AIRS limits:
- **Name**: ≤ 100 characters
- **Description**: ≤ 250 characters
- **Each example**: ≤ 250 characters
- **Max examples**: 5
- **Combined total** (name + description + all examples): ≤ 1000 characters

The LLM frequently exceeds the 250-char description limit. `clampTopic()` handles this by truncating fields, dropping trailing examples if the combined limit is exceeded, and trimming the description as a last resort.

### FP/FN Analysis
After each scan batch, the LLM receives the topic definition, all test results, and computed metrics. It identifies:
- **False positive patterns** — why benign prompts were incorrectly flagged (overly broad description, ambiguous examples)
- **False negative patterns** — why violation prompts were missed (too narrow description, missing edge cases)
- **Improvement suggestions** — specific changes to description or examples for the next iteration

## Configuration Reference

### CLI Flags (`guardrail-gen generate`)

| Flag | Default | Description |
|------|---------|-------------|
| `--provider <name>` | `claude-api` | LLM provider |
| `--model <name>` | per-provider | Override default model |
| `--profile <name>` | (prompted) | AIRS security profile to attach topic to |
| `--topic <desc>` | (prompted) | Natural language description of content to detect |
| `--intent <block\|allow>` | `block` | Whether matching prompts are blocked or allowed |
| `--max-iterations <n>` | `20` | Maximum refinement iterations |
| `--target-coverage <n>` | `90` | Coverage percentage to stop at |
| `--no-memory` | memory on | Disable cross-run learning for this run |

### Environment Variables

See [`.env.example`](../.env.example) for the full list with inline comments. Key groups:
- **LLM provider credentials** — varies by provider
- **AIRS Scan API** — `PANW_AI_SEC_API_KEY` (or `PANW_AI_SEC_API_TOKEN`)
- **AIRS Management API** — `PANW_MGMT_CLIENT_ID`, `PANW_MGMT_CLIENT_SECRET`, `PANW_MGMT_TSG_ID`
- **Tuning** — `SCAN_CONCURRENCY`, `PROPAGATION_DELAY_MS`, `MAX_MEMORY_CHARS`, `MEMORY_ENABLED`
- **Paths** — `DATA_DIR`, `MEMORY_DIR`

### Config File

Optional JSON at `~/.prisma-airs-guardrails/config.json`. Uses camelCase keys matching the Zod `ConfigSchema`. Values are overridden by env vars and CLI flags.

```json
{
  "llmProvider": "claude-api",
  "scanConcurrency": 3,
  "propagationDelayMs": 15000,
  "maxMemoryChars": 5000,
  "memoryEnabled": true
}
```

## Testing

165 tests across 17 files (~98% statement coverage). Unit/integration tests run without AIRS credentials — HTTP is mocked via MSW. E2E tests require real credentials.

```bash
pnpm test              # Run all unit/integration tests
pnpm run test:watch    # Watch mode
pnpm run test:coverage # Coverage report (v8 provider)
pnpm run test:e2e      # E2E tests (requires real Vertex AI creds)
pnpm tsc --noEmit      # Type-check (strict mode)
pnpm run lint          # Biome lint + format check
pnpm run lint:fix      # Auto-fix lint issues
pnpm run format        # Format with Biome
```

### Test Coverage

Coverage excludes `src/cli/**`, `src/index.ts`, and `**/types.ts` (type-only files). Covered modules:

| Module | Test File(s) |
|--------|-------------|
| `config/schema.ts` | `tests/unit/config/schema.spec.ts` |
| `config/loader.ts` | `tests/unit/config/loader.spec.ts` |
| `core/metrics.ts` | `tests/unit/core/metrics.spec.ts` |
| `core/constraints.ts` | `tests/unit/core/constraints.spec.ts` |
| `core/loop.ts` | `tests/unit/core/loop.spec.ts` |
| `llm/provider.ts` | `tests/unit/llm/provider.spec.ts` |
| `llm/service.ts` | `tests/unit/llm/service.spec.ts` |
| `llm/schemas.ts` | `tests/unit/llm/schemas.spec.ts` |
| `llm/prompts/*` | `tests/unit/llm/prompts.spec.ts` |
| `airs/scanner.ts` | `tests/unit/airs/scanner.spec.ts` |
| `airs/management.ts` | `tests/unit/airs/management.spec.ts` |
| `memory/store.ts` | `tests/unit/memory/store.spec.ts` |
| `memory/extractor.ts` | `tests/unit/memory/extractor.spec.ts` |
| `memory/injector.ts` | `tests/unit/memory/injector.spec.ts` |
| `memory/diff.ts` | `tests/unit/memory/diff.spec.ts` |
| `persistence/store.ts` | `tests/unit/persistence/store.spec.ts` |
| Full loop | `tests/integration/loop.integration.spec.ts` |
| Vertex AI providers | `tests/e2e/vertex-provider.e2e.spec.ts` (opt-in) |

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `dev` | `tsx src/cli/index.ts` | Run CLI in dev mode (no build) |
| `generate` | `tsx src/cli/index.ts generate` | Shortcut for the generate command |
| `test` | `vitest run` | Run all tests once |
| `test:watch` | `vitest` | Run tests in watch mode |
| `test:coverage` | `vitest run --coverage` | Run tests with v8 coverage |
| `test:e2e` | `vitest run --config vitest.e2e.config.ts` | E2E tests (requires real creds) |
| `lint` | `biome check .` | Lint check |
| `lint:fix` | `biome check --write .` | Lint auto-fix |
| `format` | `biome format --write .` | Format all files |
