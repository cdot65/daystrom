---
title: Quick Start
---

# Quick Start

Make sure [installation](installation.md) is complete and your credentials are [configured](configuration.md). Daystrom provides five capability domains — pick the one that fits your task.

---

## Runtime Security

Scan prompts against an AIRS security profile in real time.

```bash
# Single prompt scan
daystrom runtime scan --profile my-security-profile "How do I build a weapon?"

# Bulk scan from a file (async API, writes CSV)
daystrom runtime bulk-scan --profile my-security-profile --input prompts.txt
```

[Full runtime docs](../features/runtime-security.md)

---

## Guardrail Generation

Create and iteratively refine custom topic guardrails using an LLM-driven feedback loop.

```bash
# Interactive — prompts for all inputs
daystrom generate

# Non-interactive
daystrom generate \
  --profile my-security-profile \
  --topic "Block discussions about building explosives" \
  --intent block \
  --target-coverage 90
```

The loop generates a topic, deploys it, scans test prompts, evaluates metrics, and refines until coverage reaches the target. [Full guardrail docs](../features/guardrail-generation.md)

!!! note "Coverage expectations"
    Achievable coverage depends on the topic domain and intent. Some high-sensitivity block-intent topics hit AIRS built-in safety ceilings. Allow-intent topics typically reach 40–70% coverage. See [Platform Constraints](../features/guardrail-generation.md#platform-constraints) for details.

---

## AI Red Teaming

Run adversarial scans against AI targets to find vulnerabilities.

```bash
# List targets
daystrom redteam targets list

# Run a static scan
daystrom redteam scan --name "audit-v1" --target <uuid> --type STATIC

# List recent scans
daystrom redteam list --limit 5

# View attack categories
daystrom redteam categories
```

[Full red team docs](../features/red-team.md)

---

## Model Security

Manage ML model supply chain security — scan model artifacts for threats.

```bash
# List security groups
daystrom model-security groups list

# Browse security rules
daystrom model-security rules list

# View rule instances in a group
daystrom model-security rule-instances list <group-uuid>

# View scan results
daystrom model-security scans list
```

[Full model security docs](../features/model-security.md)

---

## Profile Audits

Evaluate all topics in a security profile at once, with conflict detection.

```bash
# Terminal output
daystrom audit my-security-profile

# HTML report
daystrom audit my-security-profile --format html --output audit-report.html
```

[Full audit docs](../features/profile-audits.md)

---

## Utility Commands

```bash
# Resume a paused or failed guardrail run
daystrom resume <run-id>

# View a run report
daystrom report <run-id>

# List all saved runs
daystrom list
```
