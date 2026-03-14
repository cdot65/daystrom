---
title: Home
---

<div class="hero" markdown>

![Daystrom Logo](images/daystrom-logo.svg){ .hero-logo }

# Daystrom

**CLI and library for Palo Alto Prisma AIRS AI security**

[![CI](https://github.com/cdot65/daystrom/actions/workflows/ci.yml/badge.svg)](https://github.com/cdot65/daystrom/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node 20+](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)

</div>

---

Daystrom is a CLI tool that provides full operational coverage over **Palo Alto Prisma AIRS** AI security capabilities. Generate and iteratively refine custom topic guardrails with LLM-driven feedback loops, run adversarial red team scans against AI targets, manage ML model supply chain security, and audit entire security profiles for coverage gaps and cross-topic conflicts. Named after Star Trek's Dr. Richard Daystrom, it automates the tedious so you can focus on intent.

<div class="grid cards" markdown>

-   :material-refresh-auto:{ .lg .middle } **Iterative Refinement**

    ---

    Analyzes false positives and negatives after each iteration, feeding structured feedback to the LLM until coverage meets your threshold.

-   :material-brain:{ .lg .middle } **Multi-Provider LLM**

    ---

    Six provider configs out of the box — Claude API, Claude Vertex, Claude Bedrock, Gemini API, Gemini Vertex, and Gemini Bedrock.

-   :material-memory:{ .lg .middle } **Cross-Run Memory**

    ---

    Persists learnings across runs so the LLM avoids repeating past mistakes. Budget-aware injection keeps prompts focused.

-   :material-play-pause:{ .lg .middle } **Resumable Runs**

    ---

    Every iteration checkpoints to disk. Resume failed or paused runs from exactly where they left off — no wasted API calls.

-   :material-shield-check:{ .lg .middle } **Block & Allow Intent**

    ---

    First-class support for both block (blacklist) and allow (whitelist) guardrails with intent-aware test generation and analysis.

-   :material-test-tube:{ .lg .middle } **Test Accumulation**

    ---

    Optionally carry forward test prompts across iterations with dedup, catching regressions that fresh tests might miss.

-   :material-shield-search:{ .lg .middle } **Runtime Security**

    ---

    Scan prompts against live security profiles and manage AIRS configuration — profiles, topics, API keys, customer apps, and scan logs via `daystrom runtime`.

    [:octicons-arrow-right-24: Runtime Security](features/runtime-security.md)

-   :material-sword:{ .lg .middle } **AI Red Teaming**

    ---

    Launch static, dynamic, and custom adversarial scans against AI targets. Full CRUD on targets, prompt sets, and prompts via `daystrom redteam`.

    [:octicons-arrow-right-24: Red Team](features/red-team.md)

-   :material-clipboard-check:{ .lg .middle } **Profile Audits**

    ---

    Evaluate all topics in a security profile at once. Per-topic metrics, composite scores, and cross-topic conflict detection via `daystrom audit`.

-   :material-shield-lock:{ .lg .middle } **Model Security**

    ---

    Manage ML model supply chain security — security groups, rules, scans, evaluations, violations, and labels via `daystrom model-security`.

    [:octicons-arrow-right-24: Model Security](features/model-security.md)

</div>

---

## How It Works

```mermaid
flowchart LR
    A["Describe\nwhat to block\nor allow"] --> B["LLM generates\ntopic definition"]
    B --> C["Deploy\nto AIRS"]
    C --> D["Generate\ntest prompts"]
    D --> E["Scan against\nlive service"]
    E --> F["Evaluate\nTPR · TNR · F1"]
    F --> G{Coverage\nmet?}
    G -->|No| H["Analyze\nFP / FN"]
    H --> B
    G -->|Yes| I["Done"]
```

---

## Get Started

<div class="grid cards" markdown>

-   :material-download:{ .lg .middle } **Install**

    ---

    Prerequisites, installation, and credential setup.

    [:octicons-arrow-right-24: Installation](getting-started/installation.md)

-   :material-rocket-launch:{ .lg .middle } **Quick Start**

    ---

    Run your first command in minutes.

    [:octicons-arrow-right-24: Quick Start](getting-started/quick-start.md)

-   :material-cog:{ .lg .middle } **Configure**

    ---

    LLM providers, tuning parameters, and data locations.

    [:octicons-arrow-right-24: Configuration](getting-started/configuration.md)

-   :material-book-open-variant:{ .lg .middle } **Architecture**

    ---

    Core loop, AIRS integration, memory system, and design decisions.

    [:octicons-arrow-right-24: Architecture](architecture/overview.md)

</div>
