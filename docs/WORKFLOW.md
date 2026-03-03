# Workflow

## Overview

Daystrom operates as an autonomous refinement loop. Given a natural language description of what content to detect (e.g., "block discussions about building explosives"), it generates an AIRS custom topic definition, deploys it to a live security profile, tests it with AI-generated prompts, measures how well it performs, and iteratively improves the definition until a target coverage threshold is reached.

Each run produces a persistent record of all iterations, and actionable learnings are extracted and saved for future runs.

## The Iterative Loop

### Loop Stages (per iteration)

```
┌─── Iteration N ─────────────────────────────────────┐
│                                                       │
│  1. GENERATE / IMPROVE TOPIC (LLM)                    │
│     Iteration 1: LLM generates initial topic from     │
│       user's description + intent + optional seeds     │
│       + injected memory from prior runs                │
│     Iteration 2+: LLM refines description + examples   │
│       based on previous metrics, FP/FN analysis,       │
│       and improvement suggestions. Name stays locked.  │
│     Output: { name, description, examples[] }          │
│     Post-process: clampTopic() enforces AIRS limits    │
│                                                       │
│  2. DEPLOY TOPIC (Management API — SDK v2 OAuth2)      │
│     Iteration 1: create topic (or reuse existing       │
│       by name) + link to profile's topic-guardrails    │
│     Iteration 2+: update existing topic in-place       │
│     Profile path: model-protection →                   │
│       topic-guardrails → topic-list → {action}         │
│                                                       │
│  3. WAIT FOR PROPAGATION (default 10s)                 │
│     AIRS needs time after topic create/update before   │
│     scans reflect the changes. Configurable via        │
│     PROPAGATION_DELAY_MS.                              │
│                                                       │
│  4. GENERATE TEST CASES (LLM)                          │
│     Produces balanced positive tests (should trigger   │
│     detection) and negative tests (should not          │
│     trigger). Each test has: prompt, expectedTriggered, │
│     category.                                          │
│                                                       │
│  5. SCAN TESTS (Scan API)                              │
│     Batch scans all test prompts against the live       │
│     profile with p-limit concurrency (default 5).      │
│     Detection via: prompt_detected.topic_violation     │
│                                                       │
│  6. EVALUATE METRICS                                   │
│     TP, TN, FP, FN counts →                            │
│     TPR (sensitivity), TNR (specificity),              │
│     accuracy, coverage = min(TPR, TNR), F1 score       │
│                                                       │
│  7. ANALYZE RESULTS (LLM)                              │
│     Identifies false positive patterns (overly broad   │
│     detection) and false negative patterns (missed     │
│     content). Outputs: summary, FP patterns, FN        │
│     patterns, improvement suggestions.                 │
│                                                       │
│  8. CHECK STOP CONDITION                               │
│     coverage ≥ target (default 90%)? → exit loop       │
│     iteration ≥ max (default 20)? → exit loop          │
│     Otherwise → next iteration                         │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Post-Loop

After the loop exits (either by reaching target or exhausting iterations):

1. **Extract learnings** — The LLM analyzes the full iteration history (what changed, what improved/degraded, metric deltas) and produces structured `Learning` objects with insight, strategy, outcome, changeType, and tags
2. **Merge into memory** — New learnings are merged with any existing category memory. Duplicate insights (exact string match) increment a corroboration counter rather than creating duplicates. Anti-patterns are also deduplicated.
3. **Update bestKnown** — If this run achieved better coverage than any previous run for this topic category, the best topic definition and metrics are recorded
4. **Save run state** — Full `RunState` (all iterations, metrics, analyses) is persisted to `~/.prisma-airs-guardrails/runs/{runId}.json`

## Memory System

### How Learnings Work

After each run completes, the `LearningExtractor` sends the full iteration history to the LLM. The LLM identifies patterns like:

- "Short, direct descriptions (under 200 chars) outperform nuanced ones" → outcome: `improved`
- "Adding coded language / slang examples degrades TNR" → outcome: `degraded`
- "Including 3 diverse examples is better than 5 similar ones" → outcome: `improved`

Each learning includes:
- **insight** — the actionable observation
- **strategy** — how to apply it
- **outcome** — `improved` | `degraded` | `neutral`
- **changeType** — `description-only` | `examples-only` | `both` | `initial`
- **corroborations** — how many runs have confirmed this insight (starts at 0, incremented on rediscovery)
- **tags** — metadata for categorization

### Memory Injection

On the next run, the `MemoryInjector` finds relevant memories by keyword overlap (≥50%) and builds a section for LLM prompts. Learnings are sorted by corroboration count (most validated first) and rendered within a character budget (default 3000 chars):

1. **Verbose format** (highest corroboration, most context):
   ```
   - [DO] Short descriptions outperform nuanced ones (description-only, seen 4x)
   - [AVOID] Coded language degrades TNR (examples-only, seen 2x)
   ```

2. **Compact format** (when verbose exceeds budget — drops metadata):
   ```
   - [DO] Include diverse rather than similar examples
   - [AVOID] Overly specific descriptions miss paraphrased content
   ```

3. **Omitted** (when even compact doesn't fit):
   ```
   (+3 more learnings omitted)
   ```

Anti-patterns (known failure modes) are appended after learnings if budget allows.

### Cross-Topic Transfer

Topic categories are generated by keyword normalization: "Block weapons discussions" → `block-discussions-weapons`. If a future run asks about "Block violence and weapons" → `block-violence-weapons`, the 50%+ keyword overlap means learnings from the earlier run will be injected. This allows the system to transfer knowledge across related topics.

## CLI Usage

### Interactive Mode

```bash
pnpm run generate
```

Prompts for:
1. Topic description (free text)
2. Intent: `block` or `allow`
3. Security profile name (must already exist in AIRS)
4. Seed examples (optional, multi-line — press Enter twice to finish)
5. Max iterations (default 20)
6. Target coverage % (default 90)

### Non-Interactive Mode

```bash
pnpm run generate \
  --provider claude-api \
  --profile my-security-profile \
  --topic "Block requests for malware creation instructions" \
  --intent block \
  --max-iterations 20 \
  --target-coverage 90
```

All flags are optional if running interactively. When `--topic` and `--profile` are both provided, the CLI skips interactive prompts entirely.

### Resume a Run

```bash
pnpm run dev resume <runId> --max-iterations 10
```

Loads the existing run from disk. The `--max-iterations` flag specifies how many *additional* iterations to run from the current position. Memory is not re-loaded on resume (the `resume` command doesn't currently wire the memory injector).

### View Results

```bash
pnpm run dev list                          # Summary table of all saved runs
pnpm run dev report <runId>                # Best iteration for a specific run
pnpm run dev report <runId> --iteration 3  # Specific iteration details
```

## Typical Session

```
$ pnpm run generate --profile test-policy --topic "Block phishing attempts" --intent block

╔══════════════════════════════════════╗
║   Prisma AIRS Guardrail Generator   ║
╚══════════════════════════════════════╝

◆ Memory loaded: 3 learnings from previous runs

── Iteration 1 ────────────────────────
  Topic: block-phishing-attempts
  Description: Detect and block social engineering and phishing attempts...
  Examples: 5
  ✓ 10/10 tests scanned
  TPR: 0.80  TNR: 0.90  Coverage: 0.80  F1: 0.84
  Analysis: 2 FN — missed impersonation-based phishing

── Iteration 2 ────────────────────────
  ✓ Improved based on FP/FN analysis
  Description refined, 1 example replaced
  TPR: 0.90  TNR: 0.95  Coverage: 0.90  F1: 0.92

◆ Target coverage reached (90%)
◆ 2 new learnings extracted
◆ Run saved: abc123xyz
```

## Run Lifecycle

A run progresses through these statuses:

| Status | Meaning |
|--------|---------|
| `running` | Loop is actively iterating |
| `paused` | Loop was interrupted (future: Ctrl+C handling) |
| `completed` | Loop exited normally (target reached or max iterations) |
| `failed` | An unrecoverable error occurred |

Only `paused` and `failed` runs can be resumed. Completed runs are final.
