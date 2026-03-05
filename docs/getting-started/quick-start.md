---
title: Quick Start
---

# Quick Start

## First Run

Ensure [installation](installation.md) is complete and your `.env` is [configured](configuration.md).

### Interactive Mode

Launch the interactive wizard:

```bash
pnpm run generate
```

You will be prompted for:

- **Topic description** -- what to block or allow (e.g., "Block discussions about building explosives")
- **Intent** -- `block` or `allow`
- **Security profile name** -- the Prisma AIRS profile to attach the topic to
- **Seed examples** -- optional initial examples to guide the LLM
- **Max iterations** -- upper bound on refinement loops
- **Target coverage %** -- stop when `min(TPR, TNR)` reaches this threshold

### Non-Interactive Mode

Pass all inputs as CLI flags to skip prompts:

```bash
pnpm run generate \
  --provider claude-api \
  --profile my-security-profile \
  --topic "Block discussions about building explosives" \
  --intent block \
  --target-coverage 90
```

## Example Session

```
$ pnpm run generate --profile test-policy --topic "Block phishing attempts" --intent block

╔══════════════════════════════════════╗
║            Daystrom                  ║
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

Coverage is defined as `min(TPR, TNR)`. The loop terminates when coverage meets or exceeds the target (default 90%).

## Other Commands

### Resume a Paused or Failed Run

```bash
pnpm run dev resume --run-id abc123xyz
```

Picks up from the last completed iteration checkpoint. No work is repeated.

### View a Run Report

```bash
pnpm run dev report --run-id abc123xyz
```

Displays per-iteration metrics, the final topic definition, and FP/FN analysis.

### List All Runs

```bash
pnpm run dev list
```

Shows all saved runs with status, topic name, final coverage, and timestamp.
