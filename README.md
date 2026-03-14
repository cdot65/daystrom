# Daystrom

[![CI](https://github.com/cdot65/daystrom/actions/workflows/ci.yml/badge.svg)](https://github.com/cdot65/daystrom/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node 20+](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

**CLI and library for Palo Alto Prisma AIRS — guardrail refinement, AI red teaming, model security scanning, and profile audits.**

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

## Documentation

Full docs — installation, configuration, architecture, CLI reference, examples, and more:

**[cdot65.github.io/daystrom](https://cdot65.github.io/daystrom/)**

## Commands

| Command | Description |
|---------|-------------|
| `generate` | LLM-driven guardrail generation with iterative refinement |
| `resume` | Resume a paused or failed generation run |
| `report` | View results for a saved run |
| `list` | List all saved runs |
| `runtime` | Prompt scanning + AIRS config management (profiles, topics, API keys, apps) |
| `audit` | Multi-topic profile evaluation with conflict detection |
| `redteam` | Red team scanning — targets, prompt sets, scans, reports |
| `model-security` | ML model supply chain security — groups, rules, scans |

## License

MIT
