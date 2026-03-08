# CLI Commands

Binary name: `daystrom` (or `pnpm run dev` in development).

Four subcommands manage the full guardrail lifecycle: generate, resume, report, and list.

---

## generate

Start a new guardrail generation loop.

```bash
daystrom generate [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--provider <name>` | `claude-api` | LLM provider (`claude-api`, `claude-vertex`, `claude-bedrock`, `gemini-api`, `gemini-vertex`, `gemini-bedrock`) |
| `--model <name>` | per-provider | Override default model |
| `--profile <name>` | (prompted) | AIRS security profile name |
| `--topic <desc>` | (prompted) | Natural language description of content to detect |
| `--intent <block\|allow>` | `block` | Whether matching prompts are blocked or allowed |
| `--max-iterations <n>` | `20` | Maximum refinement iterations |
| `--target-coverage <n>` | `90` | Coverage percentage to stop at |
| `--accumulate-tests` | off | Carry forward test prompts across iterations |
| `--max-accumulated-tests <n>` | unlimited | Cap on accumulated test count |
| `--no-memory` | memory on | Disable cross-run learning |

!!! tip "Non-interactive mode"
    When both `--topic` and `--profile` are provided, interactive prompts are skipped entirely.

### Interactive Mode

When flags are omitted, Inquirer prompts collect:

- Topic description
- Intent (block or allow)
- Security profile name
- Seed examples (optional)
- Max iterations
- Target coverage %
- Accumulate tests across iterations (yes/no)
- Max accumulated tests (if accumulation enabled)

### Examples

```bash
# Interactive — prompts for all inputs
pnpm run generate

# Non-interactive — all inputs via flags
pnpm run generate \
  --provider claude-api \
  --profile my-security-profile \
  --topic "Block discussions about building explosives" \
  --intent block \
  --target-coverage 90
```

---

## resume

Resume a paused or failed run from its saved state on disk.

```bash
daystrom resume <runId> [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--max-iterations <n>` | `20` | Additional iterations to run from current position |

### Example

```bash
pnpm run dev resume abc123xyz --max-iterations 10
```

!!! note
    The run must exist in the data directory (`~/.daystrom/runs/` by default). Use `daystrom list` to find run IDs.

---

## report

View results for a saved run.

```bash
daystrom report <runId> [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--iteration <n>` | (best) | Show a specific iteration instead of the best |

### Examples

```bash
# Show best iteration
pnpm run dev report abc123xyz

# Show specific iteration
pnpm run dev report abc123xyz --iteration 3
```

---

## list

List all saved runs.

```bash
daystrom list
```

Displays a summary table with:

- Run ID
- Status
- Coverage
- Iteration count
