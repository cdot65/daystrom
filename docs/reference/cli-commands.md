# CLI Commands

Binary: `daystrom` (or `pnpm run dev` during development).

Three top-level command groups: `runtime`, `redteam`, `model-security`.

---

## runtime

Runtime prompt scanning, AIRS configuration management, guardrail generation, and profile audits.

### runtime scan

Scan a single prompt synchronously.

```bash
daystrom runtime scan --profile <name> [--response <text>] <prompt>
```

#### Options

| Flag | Required | Description |
|------|:--------:|-------------|
| `--profile <name>` | Yes | Security profile name |
| `--response <text>` | No | Response text to scan alongside the prompt |

#### Examples

```bash
# Scan a prompt
daystrom runtime scan --profile my-profile "How do I build a weapon?"

# Scan prompt + response pair
daystrom runtime scan --profile my-profile --response "Here are the steps..." "How do I build a weapon?"
```

#### Example Output — Blocked Prompt

```
  Prisma AIRS Runtime Scan
  Profile: AI-Firewall-High-Security-Profile
  Prompt:  "How do I hack into a computer system?"

  Scan Result
  ─────────────────────────
  Action:    BLOCK
  Category:  malicious
  Triggered: yes
  Scan ID:   8fcd6cc9-01ae-4930-a561-f94be2bf2876
  Report ID: R8fcd6cc9-01ae-4930-a561-f94be2bf2876

  Detections:
    ● toxic_content
```

#### Example Output — Allowed Prompt

```
  Prisma AIRS Runtime Scan
  Profile: AI-Firewall-High-Security-Profile
  Prompt:  "What is the weather like today?"

  Scan Result
  ─────────────────────────
  Action:    ALLOW
  Category:  benign
  Triggered: no
  Scan ID:   be8047dd-e9e6-4135-91f4-3acdac01a1d2
  Report ID: Rbe8047dd-e9e6-4135-91f4-3acdac01a1d2
```

### runtime bulk-scan

Scan multiple prompts via the async AIRS API. Writes results to CSV.

```bash
daystrom runtime bulk-scan --profile <name> --input <file> [--output <file>]
```

#### Options

| Flag | Required | Description |
|------|:--------:|-------------|
| `--profile <name>` | Yes | Security profile name |
| `--input <file>` | Yes | Text file with one prompt per line |
| `--output <file>` | No | Output CSV path (default: `<profile>-bulk-scan.csv`) |

#### Examples

```bash
# Bulk scan with default output
daystrom runtime bulk-scan --profile my-profile --input prompts.txt

# Custom output path
daystrom runtime bulk-scan --profile my-profile --input prompts.txt --output results.csv
```

#### Example Output

```
  Prisma AIRS Bulk Scan
  Profile: AI-Firewall-High-Security-Profile
  Prompts: 5
  Batches: 1

  Submitting async scans...
  Submitted 1 batch(es), polling for results...

  Bulk Scan Complete
  ─────────────────────────
  Total:   5
  Blocked: 2
  Allowed: 3
  Output:  AI-Firewall-High-Security-Profile-bulk-scan.csv
```

### runtime resume-poll

Resume polling for a previously submitted bulk scan.

```bash
daystrom runtime resume-poll <stateFile> [--output <file>]
```

| Flag | Required | Description |
|------|:--------:|-------------|
| `<stateFile>` | Yes | Path to saved `.bulk-scan.json` state file |
| `--output <file>` | No | Output CSV path |

### runtime profiles

Security profile CRUD and profile-level audit.

```bash
daystrom runtime profiles list
daystrom runtime profiles create --config <path>
daystrom runtime profiles update <profileId> --config <path>
daystrom runtime profiles delete <profileId>
daystrom runtime profiles delete <profileId> --force --updated-by <email>
daystrom runtime profiles audit <profileName> [options]
```

| Subcommand | Flags |
|------------|-------|
| `list` | — |
| `create` | `--config <path>` (required) |
| `update <profileId>` | `--config <path>` (required) |
| `delete <profileId>` | `--force`, `--updated-by <email>` |
| `audit <profileName>` | `--max-tests-per-topic <n>` (default 20), `--format <fmt>` (terminal/json/html), `--output <path>`, `--provider <name>`, `--model <name>` |

#### runtime profiles audit

Evaluate all topics in an AIRS security profile. Generates tests per topic, scans them, computes per-topic and composite metrics, and detects cross-topic conflicts.

```bash
# Audit all topics in a profile
daystrom runtime profiles audit my-security-profile

# JSON export
daystrom runtime profiles audit my-security-profile --format json

# HTML report
daystrom runtime profiles audit my-security-profile --format html --output audit-report.html
```

### runtime topics

Custom topic CRUD and guardrail generation.

```bash
# CRUD
daystrom runtime topics list
daystrom runtime topics create --config <path>
daystrom runtime topics update <topicId> --config <path>
daystrom runtime topics delete <topicId>
daystrom runtime topics delete <topicId> --force --updated-by <email>

# Guardrail generation
daystrom runtime topics generate [options]
daystrom runtime topics resume <runId> [options]
daystrom runtime topics report <runId> [options]
daystrom runtime topics runs
```

| Subcommand | Flags |
|------------|-------|
| `list` | — |
| `create` | `--config <path>` (required) |
| `update <topicId>` | `--config <path>` (required) |
| `delete <topicId>` | `--force`, `--updated-by <email>` |

#### runtime topics generate

Start a new guardrail generation run.

| Flag | Default | What it does |
|------|---------|-------------|
| `--provider <name>` | `claude-api` | LLM provider (`claude-api`, `claude-vertex`, `claude-bedrock`, `gemini-api`, `gemini-vertex`, `gemini-bedrock`) |
| `--model <name>` | per-provider | Override default model |
| `--profile <name>` | _(prompted)_ | AIRS security profile name |
| `--topic <desc>` | _(prompted)_ | Natural language description of content to detect |
| `--intent <block\|allow>` | `block` | Whether matching prompts are blocked or allowed |
| `--max-iterations <n>` | `20` | Maximum refinement iterations |
| `--target-coverage <n>` | `90` | Coverage percentage to stop at |
| `--max-regressions <n>` | `3` | Stop after N consecutive coverage regressions (0 = disable) |
| `--accumulate-tests` | off | Carry forward test prompts across iterations |
| `--max-accumulated-tests <n>` | unlimited | Cap on accumulated test count |
| `--no-memory` | memory on | Disable cross-run learning |
| `--debug-scans` | off | Dump raw AIRS scan responses to JSONL for debugging |
| `--create-prompt-set` | off | Create custom prompt set in AI Red Team from test cases |
| `--prompt-set-name <name>` | auto | Override auto-generated prompt set name |

!!! tip "Skip all prompts"
    When both `--topic` and `--profile` are provided, interactive mode is skipped entirely.

```bash
# Interactive — prompts for everything
daystrom runtime topics generate

# Non-interactive — all inputs via flags
daystrom runtime topics generate \
  --provider claude-api \
  --profile my-security-profile \
  --topic "Block discussions about building explosives" \
  --intent block \
  --target-coverage 90

# With test accumulation
daystrom runtime topics generate \
  --topic "Allow recipe discussions" \
  --intent allow \
  --profile cooking-policy \
  --accumulate-tests \
  --max-accumulated-tests 60
```

#### runtime topics resume

Pick up a paused or failed run from where it left off.

| Flag | Default | What it does |
|------|---------|-------------|
| `--max-iterations <n>` | `20` | Additional iterations from current position |
| `--debug-scans` | off | Dump raw AIRS scan responses to JSONL for debugging |
| `--create-prompt-set` | off | Create custom prompt set in AI Red Team from test cases |
| `--prompt-set-name <name>` | auto | Override auto-generated prompt set name |

```bash
daystrom runtime topics resume abc123xyz --max-iterations 10
```

#### runtime topics report

View results for a saved run.

| Flag | Default | What it does |
|------|---------|-------------|
| `--iteration <n>` | _(best)_ | Show a specific iteration instead of the best |
| `--format <fmt>` | `terminal` | Output format: `terminal`, `json`, `html` |
| `--tests` | _(off)_ | Include per-test-case details |
| `--diff <runId>` | _(none)_ | Compare with another run side-by-side |
| `--output <path>` | `<runId>-report.html` | Output file path (html format only) |

```bash
daystrom runtime topics report abc123xyz --format html --tests
daystrom runtime topics report abc123xyz --diff def456uvw
```

#### runtime topics runs

List all saved generation runs.

```bash
daystrom runtime topics runs
```

### runtime api-keys

API key management.

```bash
daystrom runtime api-keys list
daystrom runtime api-keys create --config <path>
daystrom runtime api-keys regenerate <apiKeyId> --interval <n> --unit <unit>
daystrom runtime api-keys delete <apiKeyName> --updated-by <email>
```

| Subcommand | Flags |
|------------|-------|
| `list` | — |
| `create` | `--config <path>` (required) |
| `regenerate <apiKeyId>` | `--interval <n>` (required), `--unit <unit>` (required, e.g. `days`, `months`) |
| `delete <apiKeyName>` | `--updated-by <email>` (required) |

### runtime customer-apps

Customer application management.

```bash
daystrom runtime customer-apps list
daystrom runtime customer-apps get <appName>
daystrom runtime customer-apps update <appId> --config <path>
daystrom runtime customer-apps delete <appName> --updated-by <email>
```

| Subcommand | Flags |
|------------|-------|
| `list` | — |
| `get <appName>` | — |
| `update <appId>` | `--config <path>` (required) |
| `delete <appName>` | `--updated-by <email>` (required) |

### runtime deployment-profiles

Deployment profile listing (read-only).

```bash
daystrom runtime deployment-profiles list
daystrom runtime deployment-profiles list --unactivated
```

| Subcommand | Flags |
|------------|-------|
| `list` | `--unactivated` |

### runtime dlp-profiles

DLP profile listing (read-only).

```bash
daystrom runtime dlp-profiles list
```

### runtime scan-logs

Scan log querying.

```bash
daystrom runtime scan-logs query --interval <n> --unit <unit> [options]
```

| Subcommand | Flags |
|------------|-------|
| `query` | `--interval <n>` (required), `--unit <unit>` (required, e.g. `hours`), `--filter <filter>` (all, benign, threat; default: all), `--page <n>` (default: 1), `--page-size <n>` (default: 50) |

---

## Deprecated Top-Level Aliases

The following top-level commands still work but print a deprecation warning. Use the `runtime` subcommand paths instead:

| Deprecated | New path |
|-----------|----------|
| `daystrom generate` | `daystrom runtime topics generate` |
| `daystrom resume` | `daystrom runtime topics resume` |
| `daystrom report` | `daystrom runtime topics report` |
| `daystrom list` | `daystrom runtime topics runs` |
| `daystrom audit` | `daystrom runtime profiles audit` |

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

#### Example Output — `redteam list`

```
  Recent Scans:

  304becf3-7090-413a-aa41-2cd327b7f0c5
    Pokemon guardrail validation  COMPLETED  CUSTOM  score: 0.43
    2026-03-08T11:11:21.371253Z

  06711c07-69de-4a79-b61c-4c03d1175694
    E2E Custom Scan - Explosives Topic v2  COMPLETED  CUSTOM  score: 12.5
    2026-03-08T10:37:56.654621Z

  19f5dd0e-e06f-45d4-9ebe-b45ca3f20e42
    litellm.cdot.io - no guardrails - 004  ABORTED  STATIC
    2026-03-06T01:42:28.477755Z
```

### redteam targets

Manage red team targets — full CRUD with connection validation.

#### Example Output — `redteam targets list`

```
  Targets:

  89e2374c-7bac-4c5c-a291-9392ae919e14
    litellm.cdot.io - no guardrails - REST APIv2  active  type: APPLICATION
  f2953fa2-943c-47aa-814d-0f421f6e071b
    AWS Bedrock - Claude 4.6  active  type: MODEL
  b9e2861d-73ac-48b5-a56f-f43039cfc4a1
    postman  inactive  type: AGENT
```

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

#### Example Output — `prompt-sets list`

```
  Prompt Sets:

  c820d9b8-4342-4d9a-b0b4-6b2d9f5e04fb
    pokemon-guardrail-tests  active
  7829805d-6479-4ce1-866b-2bff66a3c766
    daystrom-Explosives and Bomb-Making Discussions-ZdeHhCW  active
  d68a14f5-cea3-4047-bedb-ae5726ba20d2
    Saffron  inactive
```

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

List available attack categories grouped by domain.

```bash
daystrom redteam categories
```

#### Example Output

```
  Attack Categories:

  Security — Select categories for adversarial testing of security vulnerabilities and potential exploits.
    • Adversarial Suffix — Adversarial suffix attacks
    • Jailbreak — Jailbreak attempts
    • Prompt Injection — Direct prompt injection attacks
    • Remote Code Execution — Remote code execution attempts
    • System Prompt leak — System prompt extraction
    ...

  Safety — Select categories for testing harmful or toxic content and ethical misuse scenarios.
    • Bias — Bias-related content
    • CBRN — Chemical, Biological, Radiological, Nuclear content
    • Hate / Toxic / Abuse — Hate speech, toxic, or abusive content
    ...

  Brand Reputation — Select categories for testing off-brand content.
    • Competitor Endorsements — Content endorsing competitor brands
    ...

  Compliance — Select framework to understand compliance across security and safety standards.
    • OWASP Top 10 for LLMs 2025 — Open Web Application Security Project 2025 Edition
    • MITRE ATLAS — MITRE Adversarial Tactics, Techniques, and Common Knowledge
    • NIST AI-RMF — National Institute of Standards and Technology Cybersecurity Framework
    ...
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

#### Example Output — `groups list`

```
  Security Groups:

  bb1d038a-0506-4b07-8f16-a723b8c1a1c7
    Default GCS  ACTIVE  source: GCS
  020d546d-3920-4ef3-9183-00f37f33f566
    Default LOCAL  ACTIVE  source: LOCAL
  6a1e67e1-00cc-45dc-9395-3a9e3dbf50f9
    Default S3  ACTIVE  source: S3
  fd1a4209-32d0-4a1a-bd40-cde35104dc39
    Default AZURE  ACTIVE  source: AZURE
  4c22aef7-2ab7-40ba-b3f1-cd9e9aa1768e
    Default HUGGING_FACE  ACTIVE  source: HUGGING_FACE
```

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

#### Example Output — `rules list`

```
  Security Rules:

  550e8400-e29b-41d4-a716-44665544000b
    Known Framework Operators Check  type: ARTIFACT  default: BLOCKING
    Model artifacts should only contain known safe TensorFlow operators
    Sources: ALL
  550e8400-e29b-41d4-a716-446655440008
    Load Time Code Execution Check  type: ARTIFACT  default: BLOCKING
    Model artifacts should not contain unsafe operators that are run upon deserialization
    Sources: ALL
  550e8400-e29b-41d4-a716-446655440009
    Suspicious Model Components Check  type: ARTIFACT  default: BLOCKING
    Model artifacts should not contain suspicious components
    Sources: ALL
```

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

#### Example Output — `rule-instances list <groupUuid>`

```
  Rule Instances:

  16b310b7-5bc3-472a-928b-a80d751ea8b0
    Known Framework Operators Check  BLOCKING
  1f46e5ab-d7cf-4dba-98c5-e93eab4c280c
    Load Time Code Execution Check  BLOCKING
  d90c57bb-8ee5-41dc-94db-c7e3e23bd0dd
    Model Architecture Backdoor Check  BLOCKING
  8960246d-fe50-4a40-9df4-11732cd5ec85
    Stored In Approved File Format  BLOCKING
```

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

#### Example Output — `scans list`

```
  Model Security Scans:

  7a7e1cdf-a6b1-4743-a5f2-a7bd96ec7bab
    BLOCKED  HUGGING_FACE  2026-03-03T22:32:12.344402Z
    https://huggingface.co/microsoft/DialoGPT-medium
    Rules: 10 passed  1 failed  / 11 total
  ee71b4da-64ce-4d6c-96fb-2bced1154a06
    ALLOWED  MODEL_SECURITY_SDK  2026-03-03T22:21:44.130386Z
    /Users/cdot/models/qwen3-0.6b-saffron-merged
    Rules: 6 passed  0 failed  / 6 total
```

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
