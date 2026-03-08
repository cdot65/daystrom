---
title: Quick Start
---

# Quick Start

Make sure [installation](installation.md) is complete and your credentials are [configured](configuration.md). Then pick your mode:

## Interactive Mode

The simplest way to start — Daystrom walks you through every option:

```bash
daystrom generate
```

You'll be prompted for:

1. **Topic description** — what to block or allow (e.g., "Block discussions about building explosives")
2. **Intent** — `block` or `allow`
3. **Security profile name** — the Prisma AIRS profile to attach the topic to
4. **Seed examples** — optional starting examples to guide the LLM
5. **Max iterations** — upper bound on refinement loops
6. **Target coverage %** — stop when `min(TPR, TNR)` reaches this threshold
7. **Accumulate tests** — optionally carry forward test prompts across iterations

## Non-Interactive Mode

Skip all prompts by passing flags directly:

```bash
daystrom generate \
  --provider claude-api \
  --profile my-security-profile \
  --topic "Block discussions about building explosives" \
  --intent block \
  --target-coverage 90
```

=== "Windows (PowerShell)"

    ```powershell
    daystrom generate `
      --provider claude-api `
      --profile my-security-profile `
      --topic "Block discussions about building explosives" `
      --intent block `
      --target-coverage 90
    ```

=== "Windows (cmd)"

    ```cmd
    daystrom generate ^
      --provider claude-api ^
      --profile my-security-profile ^
      --topic "Block discussions about building explosives" ^
      --intent block ^
      --target-coverage 90
    ```

---

## What a Run Looks Like

```
$ daystrom generate --profile test-policy --topic "Block phishing attempts" --intent block

╔══════════════════════════════════════╗
║            Daystrom                  ║
╚══════════════════════════════════════╝

◆ Memory loaded: 3 learnings from previous runs

── Iteration 1 ────────────────────────
  Topic: block-phishing-attempts
  Description: Detect and block social engineering and phishing attempts...
  Examples: 3
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

Coverage is `min(TPR, TNR)` — both detection and specificity must meet the target. The loop refines until coverage is reached or max iterations are exhausted.

---

## Other Commands

### Resume a Paused or Failed Run

```bash
daystrom resume abc123xyz
```

Picks up from the last completed iteration. No work is repeated.

### View a Run Report

```bash
daystrom report abc123xyz
```

Shows per-iteration metrics, the final topic definition, and FP/FN analysis.

### List All Runs

```bash
daystrom list
```

Summary table with status, topic name, coverage, and timestamps.
