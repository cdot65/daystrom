# Local Setup

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | >= 20.0.0 (ES2022 target) |
| pnpm | Latest (recommended) |

## Clone and Install

```bash
git clone git@github.com:cdot65/daystrom.git
cd daystrom
pnpm install
```

## Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes (or provider equivalent) | LLM provider API key |
| `PANW_AI_SEC_API_KEY` | Yes | Prisma AIRS Scan API key |
| `PANW_MGMT_CLIENT_ID` | Yes | AIRS Management OAuth2 client ID |
| `PANW_MGMT_CLIENT_SECRET` | Yes | AIRS Management OAuth2 client secret |
| `PANW_MGMT_TSG_ID` | Yes | Tenant Service Group ID |

!!! note "Tests run without credentials"
    Unit and integration tests use MSW mocks. You only need real credentials for E2E tests and actual AIRS operations.

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Run CLI via tsx (any subcommand) |
| `pnpm run generate` | Interactive guardrail generation |
| `pnpm run build` | Compile TypeScript to `dist/` |
| `pnpm test` | Run all tests |
| `pnpm run test:watch` | Watch mode |
| `pnpm run test:coverage` | Coverage report |
| `pnpm run lint` | Biome lint check |
| `pnpm run lint:fix` | Auto-fix lint issues |
| `pnpm run format` | Format with Biome |
| `pnpm run format:check` | Check formatting (no write) |
| `pnpm tsc --noEmit` | Type-check |

## Data Directories

Daystrom stores runtime data under `~/.daystrom/`:

| Path | Purpose |
|------|---------|
| `~/.daystrom/runs/` | Persisted run states (JSON) |
| `~/.daystrom/memory/` | Cross-run learning store |
| `~/.daystrom/config.json` | Optional config file (overrides Zod defaults) |

!!! info "Config priority"
    CLI flags > environment variables > `~/.daystrom/config.json` > Zod schema defaults.

## Verify Setup

Run all three checks to confirm your environment is working:

```bash
pnpm test           # All tests pass without AIRS creds (MSW mocked)
pnpm run lint       # No lint errors
pnpm tsc --noEmit   # No type errors
```

!!! success "All three should pass cleanly on a fresh clone"
    If any fail, ensure you are on Node >= 20 and have run `pnpm install`.
