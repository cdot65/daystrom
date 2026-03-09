---
title: Guardrail Generation
---

# Guardrail Generation

Daystrom's guardrail generation capability uses an LLM-driven feedback loop to create, test, and iteratively refine custom topic guardrails for Prisma AIRS security profiles.

## How It Works

1. **Generate** — An LLM produces a custom topic definition (name, description, examples) based on your intent (block or allow)
2. **Deploy** — The topic is created/updated in AIRS via the Management API and linked to your security profile
3. **Test** — Synthetic test prompts are scanned against the profile to measure detection accuracy
4. **Evaluate** — Metrics (TPR, TNR, coverage, F1) determine how well the guardrail performs
5. **Improve** — The LLM analyzes failures and refines the topic definition
6. **Repeat** — The loop continues until coverage reaches the target threshold (default 90%)

## CLI Usage

```bash
# Interactive mode — prompts for all inputs
daystrom generate

# Non-interactive with all options
daystrom generate \
  --topic-name "weapons-discussion" \
  --description "Block discussions about weapons manufacturing" \
  --intent block \
  --profile my-security-profile \
  --target-coverage 0.9 \
  --max-iterations 5
```

## Key Concepts

- **Intent**: `block` (detect violating prompts) or `allow` (detect benign prompts that should pass through)
- **Coverage**: `min(TPR, TNR)` — both detection types must meet the threshold
- **Topic name lock**: After iteration 1, only the description and examples are refined — the name stays fixed
- **Test composition**: Iteration 2+ carries forward failed tests and adds regression checks alongside fresh LLM-generated tests

## Related

- [Core Loop Architecture](../architecture/core-loop.md) — detailed loop state machine
- [Memory System](memory-system.md) — cross-run learning persistence
- [Metrics & Evaluation](metrics.md) — how TP/TN/FP/FN are classified
- [Topic Constraints](topic-constraints.md) — AIRS limits on topic definitions
- [Resumable Runs](resumable-runs.md) — pause and resume loop runs
