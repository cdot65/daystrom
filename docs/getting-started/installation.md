---
title: Installation
---

# Installation

## Prerequisites

| Requirement | Minimum Version | Notes |
|------------|----------------|-------|
| **Node.js** | >= 20 | LTS recommended — verify with `node -v` |
| **Prisma AIRS access** | -- | Scan API key + Management API OAuth2 credentials |
| **LLM provider credentials** | -- | At least one supported provider (see [Configuration](configuration.md)) |

## Install from npm

```bash
npm install -g daystrom
```

Verify:

```bash
daystrom --version
daystrom --help
```

!!! tip "npx"
    Run without installing globally:
    ```bash
    npx daystrom generate
    ```

## Platform Notes

=== "macOS / Linux"

    No additional setup required. Set credentials via environment variables or a `.env` file in your working directory:

    ```bash
    export ANTHROPIC_API_KEY=sk-ant-...
    export PANW_AI_SEC_API_KEY=your-scan-api-key
    export PANW_MGMT_CLIENT_ID=your-client-id
    export PANW_MGMT_CLIENT_SECRET=your-client-secret
    export PANW_MGMT_TSG_ID=your-tsg-id
    ```

=== "Windows (PowerShell)"

    ```powershell
    $env:ANTHROPIC_API_KEY = "sk-ant-..."
    $env:PANW_AI_SEC_API_KEY = "your-scan-api-key"
    $env:PANW_MGMT_CLIENT_ID = "your-client-id"
    $env:PANW_MGMT_CLIENT_SECRET = "your-client-secret"
    $env:PANW_MGMT_TSG_ID = "your-tsg-id"
    ```

    !!! note "Windows path length"
        If you encounter `ENAMETOOLONG` errors, enable long paths in Windows:
        ```powershell
        # Run as Administrator
        New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
          -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
        ```

=== "Windows (cmd)"

    ```cmd
    set ANTHROPIC_API_KEY=sk-ant-...
    set PANW_AI_SEC_API_KEY=your-scan-api-key
    set PANW_MGMT_CLIENT_ID=your-client-id
    set PANW_MGMT_CLIENT_SECRET=your-client-secret
    set PANW_MGMT_TSG_ID=your-tsg-id
    ```

All five credential values are required for a functional run. The LLM key depends on your chosen provider — see the [provider table](configuration.md#llm-providers) for alternatives to `ANTHROPIC_API_KEY`.

## Docker

No Node.js required — just Docker. Multi-arch image supports both amd64 (Intel) and arm64 (Apple Silicon, Graviton).

```bash
docker run --rm --env-file .env \
  -v ~/.daystrom:/root/.daystrom \
  ghcr.io/cdot65/daystrom generate \
  --profile my-security-profile \
  --topic "Block phishing attempts" \
  --intent block
```

Create a `.env` file with your credentials:

```dotenv title=".env"
ANTHROPIC_API_KEY=sk-ant-...
PANW_AI_SEC_API_KEY=your-scan-api-key
PANW_MGMT_CLIENT_ID=your-client-id
PANW_MGMT_CLIENT_SECRET=your-client-secret
PANW_MGMT_TSG_ID=your-tsg-id
```

The `-v ~/.daystrom:/root/.daystrom` mount persists run state and learnings between containers.

!!! tip "Other commands"
    ```bash
    docker run --rm -v ~/.daystrom:/root/.daystrom ghcr.io/cdot65/daystrom list
    docker run --rm -v ~/.daystrom:/root/.daystrom ghcr.io/cdot65/daystrom report <runId>
    ```

!!! tip "Shell alias"
    Add to your `.bashrc` / `.zshrc` for convenience:
    ```bash
    alias daystrom='docker run --rm --env-file .env -v ~/.daystrom:/root/.daystrom ghcr.io/cdot65/daystrom'
    ```
    Then use `daystrom generate`, `daystrom list`, etc.

## Data Locations

Daystrom stores config, run state, and learnings under `~/.daystrom/`:

| Path | Purpose |
|------|---------|
| `~/.daystrom/config.json` | Persistent configuration |
| `~/.daystrom/runs/` | Saved run states (JSON per run) |
| `~/.daystrom/memory/` | Cross-run learnings (JSON per category) |

On Windows, `~` resolves to `%USERPROFILE%` (typically `C:\Users\<username>`).

## Install from Source

For development or contributing:

```bash
git clone git@github.com:cdot65/daystrom.git
cd daystrom
pnpm install
cp .env.example .env
```

Requires **pnpm >= 8** (`corepack enable` to install).

### Build & Run

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

### Verify

```bash
pnpm test          # All tests
pnpm run lint      # Lint
pnpm tsc --noEmit  # Type-check
```

All three should pass cleanly on a fresh clone with no configuration required.
