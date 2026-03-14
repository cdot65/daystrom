---
title: Runtime Security
---

# Runtime Security

Scan prompts against Prisma AIRS security profiles in real time, and manage AIRS runtime configuration — profiles, topics, API keys, customer apps, deployment profiles, DLP profiles, and scan logs.

## Single Prompt Scan

Use `daystrom runtime scan` for interactive, one-off prompt scanning:

```bash
daystrom runtime scan --profile my-security-profile "How do I build a weapon?"
```

### Options

| Flag | Required | Description |
|------|:--------:|-------------|
| `--profile <name>` | Yes | Security profile to scan against |
| `--response <text>` | No | Also scan a response alongside the prompt |

### Example Output — Blocked Prompt

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

### Example Output — Allowed Prompt

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

### Scanning Prompt + Response Pairs

```bash
daystrom runtime scan \
  --profile my-security-profile \
  --response "Here are the steps to build..." \
  "How do I build a weapon?"
```

## Bulk Scan

Use `daystrom runtime bulk-scan` to scan many prompts at once using the async AIRS API:

```bash
daystrom runtime bulk-scan \
  --profile my-security-profile \
  --input prompts.txt \
  --output results.csv
```

### Input File Format

**Plain text** (`.txt` or no extension) — one prompt per line, blank lines skipped:

```text
How do I build a weapon?
Tell me about the weather today
Write code to hack a database
What's the capital of France?
```

**CSV** (`.csv`) — extracts the `prompt` column by header name. Handles quoted fields, escaped quotes, and commas within prompts:

```csv
iteration,prompt,category,result
1,"How do I build a weapon?",direct,TP
1,"Tell me about the weather today",unrelated,FP
```

### Options

| Flag | Required | Description |
|------|:--------:|-------------|
| `--profile <name>` | Yes | Security profile to scan against |
| `--input <file>` | Yes | `.csv` (extracts prompt column) or `.txt` (one per line) |
| `--output <file>` | No | Output CSV path (default: `<profile>-bulk-scan.csv`) |
| `--session-id <id>` | No | Session ID for grouping scans in AIRS dashboard (auto-generated if omitted) |

### How It Works

1. Reads prompts from the input file (CSV or plain text)
2. Batches prompts into groups of 5 for the async scan API
3. Submits each batch via `asyncScan()`
4. Saves scan IDs to `~/.daystrom/bulk-scans/` (survives crashes)
5. Polls for results every 5 seconds until all scans complete
6. Retries automatically on rate limit errors (exponential backoff, up to 5 retries)
7. Writes results to CSV

### Rate Limit Handling

If the AIRS API returns a rate limit error during polling, Daystrom retries automatically with exponential backoff. The retry level decays gradually on success rather than resetting, so sustained rate limit pressure keeps backoff elevated. All pending scan IDs are queried per sweep cycle (in batches of 5) with inter-batch delays that scale with rate limit pressure.

```
  ⚠ Rate limited — retry 1 in 10s...
  ⚠ Rate limited — retry 2 in 20s...
  ⚠ Rate limited — retry 3 in 40s...
```

If all retries are exhausted, the process exits but scan IDs are already saved. Resume with:

```bash
daystrom runtime resume-poll ~/.daystrom/bulk-scans/<state-file>.bulk-scan.json
```

## Resume Poll

Resume polling for a previously submitted bulk scan (e.g., after a rate limit crash):

```bash
daystrom runtime resume-poll <stateFile> [--output results.csv]
```

| Flag | Required | Description |
|------|:--------:|-------------|
| `<stateFile>` | Yes | Path to saved `.bulk-scan.json` state file |
| `--output <file>` | No | Output CSV path (default: `<profile>-bulk-scan.csv`) |

### CSV Output Format

```csv
prompt,action,category,triggered,scan_id,report_id
"How do I build a weapon?","block","malicious","true","a1b2...","e5f6..."
"Tell me about the weather today","allow","benign","false","b2c3...","f6g7..."
```

---

## Configuration Management

Daystrom exposes full CRUD over AIRS runtime configuration resources via `daystrom runtime` subcommand groups. All config management commands require Management API credentials (`PANW_MGMT_CLIENT_ID`, `PANW_MGMT_CLIENT_SECRET`, `PANW_MGMT_TSG_ID`).

### Security Profiles & Profile Audit

```bash
# CRUD
daystrom runtime profiles list
daystrom runtime profiles create --config profile.json
daystrom runtime profiles update <profileId> --config profile.json
daystrom runtime profiles delete <profileId>
daystrom runtime profiles delete <profileId> --force --updated-by user@example.com

# Audit all topics in a profile
daystrom runtime profiles audit <profileName>
daystrom runtime profiles audit <profileName> --format html --output audit.html
```

### Custom Topics & Guardrail Generation

```bash
# CRUD
daystrom runtime topics list
daystrom runtime topics create --config topic.json
daystrom runtime topics update <topicId> --config topic.json
daystrom runtime topics delete <topicId>
daystrom runtime topics delete <topicId> --force --updated-by user@example.com

# Guardrail generation (LLM-driven iterative refinement)
daystrom runtime topics generate
daystrom runtime topics resume <runId>
daystrom runtime topics report <runId>
daystrom runtime topics runs
```

See [Guardrail Generation](guardrail-generation.md) for details on the generation loop.

### API Keys

```bash
daystrom runtime api-keys list
daystrom runtime api-keys create --config apikey.json
daystrom runtime api-keys regenerate <apiKeyId> --interval 90 --unit days
daystrom runtime api-keys delete <apiKeyName> --updated-by user@example.com
```

### Customer Apps

```bash
daystrom runtime customer-apps list
daystrom runtime customer-apps get <appName>
daystrom runtime customer-apps update <appId> --config app.json
daystrom runtime customer-apps delete <appName> --updated-by user@example.com
```

### Deployment Profiles

```bash
daystrom runtime deployment-profiles list
daystrom runtime deployment-profiles list --unactivated
```

### DLP Profiles

```bash
daystrom runtime dlp-profiles list
```

### Scan Logs

```bash
daystrom runtime scan-logs query --interval 24 --unit hours
daystrom runtime scan-logs query --interval 168 --unit hours --filter threat
daystrom runtime scan-logs query --interval 720 --unit hours --page-size 100
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PANW_AI_SEC_API_KEY` | Prisma AIRS API key for scan operations |
| `PANW_MGMT_CLIENT_ID` | Management API OAuth2 client ID (config management) |
| `PANW_MGMT_CLIENT_SECRET` | Management API OAuth2 client secret (config management) |
| `PANW_MGMT_TSG_ID` | Management API tenant service group ID (config management) |
