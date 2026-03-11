---
title: Runtime Security
---

# Runtime Security

Scan prompts against Prisma AIRS security profiles in real time. Daystrom supports both single-prompt sync scans and multi-prompt async bulk scans.

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

### How It Works

1. Reads prompts from the input file (CSV or plain text)
2. Batches prompts into groups of 5 for the async scan API
3. Submits each batch via `asyncScan()`
4. Saves scan IDs to `~/.daystrom/bulk-scans/` (survives crashes)
5. Polls for results every 5 seconds until all scans complete
6. Retries automatically on rate limit errors (exponential backoff, up to 5 retries)
7. Writes results to CSV

### Rate Limit Handling

If the AIRS API returns a rate limit error during polling, Daystrom retries automatically with exponential backoff (10s, 20s, 40s, 80s, 160s). You'll see retry messages in the terminal:

```
  ⚠ Rate limited — retry 1 in 10s...
  ⚠ Rate limited — retry 2 in 20s...
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

## Environment Variables

Runtime scanning requires:

| Variable | Description |
|----------|-------------|
| `PANW_AI_SEC_API_KEY` | Prisma AIRS API key for scan operations |
