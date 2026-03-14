# Daystrom

[![CI](https://github.com/cdot65/daystrom/actions/workflows/ci.yml/badge.svg)](https://github.com/cdot65/daystrom/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node 20+](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

**Full operational coverage over Palo Alto Prisma AIRS AI security — guardrail refinement, runtime scanning, AI red teaming, model security, and profile audits.**

> **[Read the full documentation](https://cdot65.github.io/daystrom/)** — installation, configuration, architecture, CLI reference, and examples.

## Install

```bash
npm install -g @cdot65/daystrom
```

Requires **Node.js >= 20**.

## Quick Start

```bash
cp .env.example .env   # add your API keys
daystrom generate       # interactive guardrail generation
```

## Commands

| Command | Description |
|---------|-------------|
| `generate` | LLM-driven guardrail generation with iterative refinement |
| `resume` | Resume a paused or failed generation run |
| `report` | View results for a saved run (terminal, JSON, HTML) |
| `list` | List all saved runs |
| `runtime` | Prompt scanning + config management (profiles, topics, API keys, apps, scan logs) |
| `audit` | Multi-topic profile evaluation with conflict detection |
| `redteam` | Adversarial scanning — targets, prompt sets, scans, reports |
| `model-security` | ML model supply chain security — groups, rules, scans, labels |

## License

MIT
