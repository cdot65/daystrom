---
title: Installation
---

# Installation

## Prerequisites

| Requirement | Minimum Version | Notes |
|------------|----------------|-------|
| **Node.js** | >= 20 | LTS recommended |
| **pnpm** | >= 8 | `corepack enable` to install |
| **Prisma AIRS access** | -- | Scan API key + Management API OAuth2 credentials |
| **LLM provider credentials** | -- | At least one supported provider (see [Configuration](configuration.md)) |

## Setup

```bash
git clone git@github.com:cdot65/daystrom.git
cd daystrom
pnpm install
cp .env.example .env
```

Edit `.env` with your credentials:

```dotenv title=".env"
# LLM provider (at minimum one of these)
ANTHROPIC_API_KEY=sk-ant-...

# Prisma AIRS Scan API
PANW_AI_SEC_API_KEY=your-scan-api-key

# Prisma AIRS Management API (OAuth2)
PANW_MGMT_CLIENT_ID=your-client-id
PANW_MGMT_CLIENT_SECRET=your-client-secret
PANW_MGMT_TSG_ID=your-tsg-id
```

!!! warning "Required credentials"
    All five values above are required for a functional run. The LLM key depends on your chosen provider -- see the [provider table](configuration.md#llm-providers) for alternatives to `ANTHROPIC_API_KEY`.

## Build & Run

=== "Development"

    Run directly via `tsx` without a build step:

    ```bash
    pnpm run generate
    ```

=== "Production"

    Compile TypeScript first, then run the built output:

    ```bash
    pnpm run build
    node dist/cli/index.js generate
    ```

## Verify

Confirm everything is working:

```bash
# Run tests
pnpm test

# Lint
pnpm run lint

# Type-check
pnpm tsc --noEmit
```

All three should pass cleanly on a fresh clone with no configuration required.
