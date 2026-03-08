# CLI Commands

Binary: `daystrom` (or `pnpm run dev` during development).

Four commands manage the full guardrail lifecycle.

---

## generate

Start a new guardrail generation run.

```bash
daystrom generate [options]
```

### Options

| Flag | Default | What it does |
|------|---------|-------------|
| `--provider <name>` | `claude-api` | LLM provider (`claude-api`, `claude-vertex`, `claude-bedrock`, `gemini-api`, `gemini-vertex`, `gemini-bedrock`) |
| `--model <name>` | per-provider | Override default model |
| `--profile <name>` | _(prompted)_ | AIRS security profile name |
| `--topic <desc>` | _(prompted)_ | Natural language description of content to detect |
| `--intent <block\|allow>` | `block` | Whether matching prompts are blocked or allowed |
| `--max-iterations <n>` | `20` | Maximum refinement iterations |
| `--target-coverage <n>` | `90` | Coverage percentage to stop at |
| `--accumulate-tests` | off | Carry forward test prompts across iterations |
| `--max-accumulated-tests <n>` | unlimited | Cap on accumulated test count |
| `--no-memory` | memory on | Disable cross-run learning |

!!! tip "Skip all prompts"
    When both `--topic` and `--profile` are provided, interactive mode is skipped entirely.

### Interactive Mode

When flags are omitted, Daystrom walks you through:

1. Topic description
2. Intent (block or allow)
3. Security profile name
4. Seed examples (optional)
5. Max iterations
6. Target coverage %
7. Accumulate tests across iterations (yes/no)
8. Max accumulated tests (if accumulation enabled)

### Examples

```bash
# Interactive — prompts for everything
daystrom generate

# Non-interactive — all inputs via flags
daystrom generate \
  --provider claude-api \
  --profile my-security-profile \
  --topic "Block discussions about building explosives" \
  --intent block \
  --target-coverage 90

# With test accumulation
daystrom generate \
  --topic "Allow recipe discussions" \
  --intent allow \
  --profile cooking-policy \
  --accumulate-tests \
  --max-accumulated-tests 60
```

---

## resume

Pick up a paused or failed run from where it left off.

```bash
daystrom resume <runId> [options]
```

| Flag | Default | What it does |
|------|---------|-------------|
| `--max-iterations <n>` | `20` | Additional iterations from current position |

```bash
daystrom resume abc123xyz --max-iterations 10
```

!!! note
    The run must exist in the data directory (`~/.daystrom/runs/`). Use `daystrom list` to find run IDs. Settings like `accumulateTests` are inherited from the original run.

---

## report

View results for a saved run.

```bash
daystrom report <runId> [options]
```

| Flag | Default | What it does |
|------|---------|-------------|
| `--iteration <n>` | _(best)_ | Show a specific iteration instead of the best |

```bash
# Best iteration
daystrom report abc123xyz

# Specific iteration
daystrom report abc123xyz --iteration 3
```

---

## list

Show all saved runs.

```bash
daystrom list
```

Displays a summary table with run ID, status, coverage, and iteration count.
