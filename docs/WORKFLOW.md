# Workflow

## The Iterative Loop

Daystrom runs an automated loop that progressively refines a custom topic guardrail until it meets a target coverage threshold.

### Loop Stages

```
┌─── Iteration N ──────────────────────────────────┐
│                                                    │
│  1. Generate/Improve Topic (LLM)                   │
│     ├─ Iteration 1: generate from description      │
│     └─ Iteration 2+: improve based on analysis     │
│                                                    │
│  2. Deploy Topic (Management API)                  │
│     ├─ Create or update custom topic               │
│     └─ Link to security profile                    │
│                                                    │
│  3. Wait for Propagation (default 10s)             │
│                                                    │
│  4. Generate Test Cases (LLM)                      │
│     ├─ Positive tests (should trigger)             │
│     └─ Negative tests (should not trigger)         │
│                                                    │
│  5. Scan Tests (Scan API)                          │
│     └─ Batch scan with concurrency control         │
│                                                    │
│  6. Evaluate Metrics                               │
│     ├─ TPR (true positive rate)                    │
│     ├─ TNR (true negative rate)                    │
│     ├─ Coverage = min(TPR, TNR)                    │
│     ├─ Accuracy, F1                                │
│     └─ TP, TN, FP, FN counts                      │
│                                                    │
│  7. Analyze Results (LLM)                          │
│     ├─ Identify FP/FN patterns                     │
│     └─ Suggest improvements                        │
│                                                    │
│  8. Check: coverage ≥ target?                      │
│     ├─ Yes → exit loop                             │
│     └─ No → next iteration                         │
│                                                    │
└──────────────────────────────────────────────────┘
```

### Post-Loop

1. **Extract learnings** — LLM analyzes iteration diffs to identify what worked and what didn't
2. **Persist memory** — Learnings saved to `~/.prisma-airs-guardrails/memory/` for future runs
3. **Save run state** — Full run history saved to `~/.prisma-airs-guardrails/runs/`

## Memory System

### How Learning Works

After each run, Daystrom extracts insights like:
- "Short, direct descriptions outperform nuanced ones" (improved, seen 4x)
- "Adding coded language examples degrades TNR" (degraded, seen 2x)

On the next run with a similar topic, these learnings are injected into LLM prompts to inform generation — giving the system a head start.

### Memory Injection

Learnings are sorted by corroboration count (most validated first) and injected with a character budget:

1. **Verbose format** (high corroboration): `- [DO] insight (changeType, seen Nx)`
2. **Compact format** (overflow): `- [DO] insight`
3. **Omitted** (beyond budget): `(+N more learnings omitted)`

### Cross-Topic Transfer

Topics are categorized by keyword extraction. A run about "block weapons discussions" may benefit from learnings about "block violence discussions" if keyword overlap exceeds 50%.

## CLI Usage

### Interactive Mode

```bash
pnpm run generate
```

Prompts for: topic description, intent (block/allow), profile name, seed examples, max iterations, target coverage.

### Non-Interactive Mode

```bash
pnpm run generate \
  --profile my-profile \
  --topic "Block requests for malware creation instructions" \
  --intent block \
  --max-iterations 20 \
  --target-coverage 90
```

### Resume a Run

```bash
pnpm run dev resume <runId> --max-iterations 10
```

### View Results

```bash
pnpm run dev list                      # All runs
pnpm run dev report <runId>            # Best iteration
pnpm run dev report <runId> --iteration 3  # Specific iteration
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
  Description: Detect and block social engineering...
  ✓ 10/10 tests scanned
  TPR: 0.80  TNR: 0.90  Coverage: 0.80  F1: 0.84

── Iteration 2 ────────────────────────
  ✓ Improved based on FP/FN analysis
  TPR: 0.90  TNR: 0.95  Coverage: 0.90  F1: 0.92

◆ Target coverage reached (90%)
◆ 2 new learnings extracted
◆ Run saved: abc123xyz
```
