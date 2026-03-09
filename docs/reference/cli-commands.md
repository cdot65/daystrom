# CLI Commands

Binary: `daystrom` (or `pnpm run dev` during development).

Seven command groups manage the full guardrail lifecycle.

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
| `--debug-scans` | off | Dump raw AIRS scan responses to JSONL for debugging |
| `--create-prompt-set` | off | Create custom prompt set in AI Red Team from test cases |
| `--prompt-set-name <name>` | auto | Override auto-generated prompt set name |

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
| `--debug-scans` | off | Dump raw AIRS scan responses to JSONL for debugging |
| `--create-prompt-set` | off | Create custom prompt set in AI Red Team from test cases |
| `--prompt-set-name <name>` | auto | Override auto-generated prompt set name |

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
| `--format <fmt>` | `terminal` | Output format: `terminal`, `json`, `html` |
| `--tests` | _(off)_ | Include per-test-case details |
| `--diff <runId>` | _(none)_ | Compare with another run side-by-side |
| `--output <path>` | `<runId>-report.html` | Output file path (html format only) |

```bash
# Best iteration (terminal)
daystrom report abc123xyz

# Specific iteration
daystrom report abc123xyz --iteration 3

# JSON export (to stdout)
daystrom report abc123xyz --format json --tests

# HTML report with test details
daystrom report abc123xyz --format html --tests --output my-report.html

# Compare two runs
daystrom report abc123xyz --diff def456uvw
```

---

## list

Show all saved runs.

```bash
daystrom list
```

Displays a summary table with run ID, status, coverage, and iteration count.

---

## audit

Evaluate all topics in an AIRS security profile. Generates tests per topic, scans them, computes per-topic and composite metrics, and detects cross-topic conflicts.

```bash
daystrom audit <profileName> [options]
```

### Options

| Flag | Default | What it does |
|------|---------|-------------|
| `--max-tests-per-topic <n>` | `20` | Max test cases generated per topic |
| `--format <fmt>` | `terminal` | Output format: `terminal`, `json`, `html` |
| `--output <path>` | `<profile>-audit.html` | Output file path (html format only) |
| `--provider <name>` | `claude-api` | LLM provider |
| `--model <name>` | per-provider | Override default model |

### Examples

```bash
# Audit all topics in a profile
daystrom audit my-security-profile

# JSON export
daystrom audit my-security-profile --format json

# HTML report
daystrom audit my-security-profile --format html --output audit-report.html

# Limit test generation
daystrom audit my-security-profile --max-tests-per-topic 20
```

---

## redteam

AI Red Team scan operations. All subcommands share the `redteam` prefix.

### redteam scan

Execute a red team scan against a target.

```bash
daystrom redteam scan [options]
```

| Flag | Default | What it does |
|------|---------|-------------|
| `--target <uuid>` | _(required)_ | Target UUID to scan |
| `--name <name>` | _(required)_ | Scan name |
| `--type <type>` | `STATIC` | Job type: `STATIC`, `DYNAMIC`, or `CUSTOM` |
| `--categories <json>` | all | Category filter JSON (STATIC scans) |
| `--prompt-sets <uuids>` | — | Comma-separated prompt set UUIDs (CUSTOM scans) |
| `--no-wait` | wait | Submit without waiting for completion |

```bash
# Static scan with all categories
daystrom redteam scan --target <uuid> --name "Full Scan"

# Custom scan with a daystrom-generated prompt set
daystrom redteam scan \
  --target <uuid> --name "Topic Validation" \
  --type CUSTOM --prompt-sets <uuid1>,<uuid2>
```

### redteam status

```bash
daystrom redteam status <jobId>
```

### redteam report

```bash
daystrom redteam report <jobId> [options]
```

| Flag | Default | What it does |
|------|---------|-------------|
| `--attacks` | off | Include individual attack list |
| `--severity <level>` | all | Filter attacks by severity |
| `--limit <n>` | `20` | Max attacks to show |

### redteam list

```bash
daystrom redteam list [options]
```

| Flag | Default | What it does |
|------|---------|-------------|
| `--status <status>` | all | Filter: QUEUED, RUNNING, COMPLETED, FAILED, ABORTED |
| `--type <type>` | all | Filter: STATIC, DYNAMIC, CUSTOM |
| `--target <uuid>` | all | Filter by target UUID |
| `--limit <n>` | `10` | Max results |

### redteam targets

Manage red team targets — full CRUD with connection validation.

```bash
daystrom redteam targets list                          # List all targets
daystrom redteam targets get <uuid>                    # Get target details
daystrom redteam targets create --config target.json   # Create from JSON file
daystrom redteam targets create --config t.json --validate  # Create + validate connection
daystrom redteam targets update <uuid> --config u.json # Update target
daystrom redteam targets update <uuid> --config u.json --validate
daystrom redteam targets delete <uuid>                 # Delete target
daystrom redteam targets probe --config conn.json      # Test connection
daystrom redteam targets profile <uuid>                # View target profile
daystrom redteam targets update-profile <uuid> --config p.json
```

| Subcommand | Flags |
|------------|-------|
| `list` | — |
| `get <uuid>` | — |
| `create` | `--config <path>` (required), `--validate` |
| `update <uuid>` | `--config <path>` (required), `--validate` |
| `delete <uuid>` | — |
| `probe` | `--config <path>` (required) |
| `profile <uuid>` | — |
| `update-profile <uuid>` | `--config <path>` (required) |

### redteam prompt-sets

Manage custom prompt sets — CRUD, CSV upload/download, archive.

```bash
daystrom redteam prompt-sets list                          # List all sets
daystrom redteam prompt-sets get <uuid>                    # Details + version info
daystrom redteam prompt-sets create --name "My Set"        # Create
daystrom redteam prompt-sets update <uuid> --name "New"    # Update
daystrom redteam prompt-sets archive <uuid>                # Archive
daystrom redteam prompt-sets archive <uuid> --unarchive    # Unarchive
daystrom redteam prompt-sets download <uuid>               # Download CSV template
daystrom redteam prompt-sets upload <uuid> prompts.csv     # Upload CSV
```

| Subcommand | Flags |
|------------|-------|
| `list` | — |
| `get <uuid>` | — |
| `create` | `--name` (required), `--description` |
| `update <uuid>` | `--name`, `--description` |
| `archive <uuid>` | `--unarchive` |
| `download <uuid>` | `--output <path>` |
| `upload <uuid> <file>` | — |

### redteam prompts

Manage individual prompts within prompt sets.

```bash
daystrom redteam prompts list <setUuid>                        # List prompts
daystrom redteam prompts get <setUuid> <promptUuid>            # Get prompt
daystrom redteam prompts add <setUuid> --prompt "text"         # Add prompt
daystrom redteam prompts update <setUuid> <promptUuid> --prompt "new"  # Update
daystrom redteam prompts delete <setUuid> <promptUuid>         # Delete
```

| Subcommand | Flags |
|------------|-------|
| `list <setUuid>` | `--limit <n>` (default 50) |
| `get <setUuid> <promptUuid>` | — |
| `add <setUuid>` | `--prompt` (required), `--goal` |
| `update <setUuid> <promptUuid>` | `--prompt`, `--goal` |
| `delete <setUuid> <promptUuid>` | — |

### redteam properties

Manage custom attack property names and values.

```bash
daystrom redteam properties list                               # List names
daystrom redteam properties create --name "category"           # Create name
daystrom redteam properties values category                    # List values
daystrom redteam properties add-value --name cat --value sec   # Add value
```

### redteam categories

List available attack categories.

```bash
daystrom redteam categories
```

### redteam abort

Abort a running scan.

```bash
daystrom redteam abort <jobId>
```

---

## model-security

AI Model Security operations — manage security groups, browse rules, and configure rule instances.

### model-security groups

Manage security groups that define scanning policies for ML model sources.

```bash
daystrom model-security groups list [options]
daystrom model-security groups get <uuid>
daystrom model-security groups create --config <path>
daystrom model-security groups update <uuid> [options]
daystrom model-security groups delete <uuid>
```

| Subcommand | Flags |
|------------|-------|
| `list` | `--source-types <types>`, `--search <query>`, `--sort-field <field>`, `--sort-dir <dir>`, `--enabled-rules <uuids>`, `--limit <n>` (default 20) |
| `get <uuid>` | — |
| `create` | `--config <path>` (required) |
| `update <uuid>` | `--name <name>`, `--description <desc>` |
| `delete <uuid>` | — |

#### Group config JSON format

```json
{
  "name": "My Security Group",
  "source_type": "LOCAL",
  "description": "Scans local model files",
  "rule_configurations": {}
}
```

### model-security rules

Browse available security rules (read-only).

```bash
daystrom model-security rules list [options]
daystrom model-security rules get <uuid>
```

| Subcommand | Flags |
|------------|-------|
| `list` | `--source-type <type>`, `--search <query>`, `--limit <n>` (default 20) |
| `get <uuid>` | — |

### model-security rule-instances

Manage rule instances within security groups.

```bash
daystrom model-security rule-instances list <groupUuid> [options]
daystrom model-security rule-instances get <groupUuid> <instanceUuid>
daystrom model-security rule-instances update <groupUuid> <instanceUuid> --config <path>
```

| Subcommand | Flags |
|------------|-------|
| `list <groupUuid>` | `--security-rule-uuid <uuid>`, `--state <state>`, `--limit <n>` (default 20) |
| `get <groupUuid> <instanceUuid>` | — |
| `update <groupUuid> <instanceUuid>` | `--config <path>` (required) |

#### Rule instance update JSON format

```json
{
  "state": "BLOCKING",
  "field_values": {
    "threshold": 0.8
  }
}
```

### model-security scans

Model security scan operations — create, list, inspect scans and their results.

```bash
daystrom model-security scans list [options]
daystrom model-security scans get <uuid>
daystrom model-security scans create --config <path>
daystrom model-security scans evaluations <scanUuid> [--limit <n>]
daystrom model-security scans evaluation <uuid>
daystrom model-security scans violations <scanUuid> [--limit <n>]
daystrom model-security scans violation <uuid>
daystrom model-security scans files <scanUuid> [--type <type>] [--result <result>] [--limit <n>]
```

| Subcommand | Flags |
|------------|-------|
| `list` | `--eval-outcome <outcome>`, `--source-type <type>`, `--scan-origin <origin>`, `--search <query>`, `--limit <n>` (default 20) |
| `get <uuid>` | — |
| `create` | `--config <path>` (required) |
| `evaluations <scanUuid>` | `--limit <n>` (default 20) |
| `evaluation <uuid>` | — |
| `violations <scanUuid>` | `--limit <n>` (default 20) |
| `violation <uuid>` | — |
| `files <scanUuid>` | `--type <type>`, `--result <result>`, `--limit <n>` (default 20) |

### model-security labels

Manage labels on model security scans.

```bash
daystrom model-security labels add <scanUuid> --labels '<json>'
daystrom model-security labels set <scanUuid> --labels '<json>'
daystrom model-security labels delete <scanUuid> --keys <key1,key2>
daystrom model-security labels keys [--limit <n>]
daystrom model-security labels values <key> [--limit <n>]
```

| Subcommand | Flags |
|------------|-------|
| `add <scanUuid>` | `--labels <json>` (required) |
| `set <scanUuid>` | `--labels <json>` (required) |
| `delete <scanUuid>` | `--keys <keys>` (required, comma-separated) |
| `keys` | `--limit <n>` (default 20) |
| `values <key>` | `--limit <n>` (default 20) |

### model-security pypi-auth

Get PyPI authentication URL for Google Artifact Registry.

```bash
daystrom model-security pypi-auth
