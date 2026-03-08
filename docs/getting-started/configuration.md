---
title: Configuration
---

# Configuration

## Config Cascade

Daystrom resolves configuration in priority order:

```
CLI flags  >  Environment variables  >  ~/.daystrom/config.json  >  Zod defaults
```

Higher-priority sources override lower ones. All fields have sensible defaults via the Zod schema, so only credentials are strictly required.

## Config File

Create `~/.daystrom/config.json` for persistent defaults:

```json title="~/.daystrom/config.json"
{
  "llmProvider": "claude-api",
  "scanConcurrency": 5,
  "propagationDelayMs": 10000,
  "maxMemoryChars": 3000,
  "memoryEnabled": true
}
```

## LLM Providers

| Provider | Config Value | Default Model | Auth |
|----------|-------------|---------------|------|
| Claude API | `claude-api` | `claude-opus-4-6` | `ANTHROPIC_API_KEY` |
| Claude Vertex | `claude-vertex` | `claude-opus-4-6` | GCP ADC |
| Claude Bedrock | `claude-bedrock` | `anthropic.claude-opus-4-6-v1` | AWS creds |
| Gemini API | `gemini-api` | `gemini-2.0-flash` | `GOOGLE_API_KEY` |
| Gemini Vertex | `gemini-vertex` | `gemini-2.0-flash` | GCP ADC |
| Gemini Bedrock | `gemini-bedrock` | `gemini-2.0-flash` | AWS creds |

!!! note "Claude Vertex region"
    The `claude-vertex` provider defaults to the `global` region, not `us-central1`. Override with `GOOGLE_CLOUD_LOCATION` if needed.

## Tuning Parameters

| Env Var | Config Key | Default | Description |
|---------|-----------|---------|-------------|
| `SCAN_CONCURRENCY` | `scanConcurrency` | `5` | Parallel scan requests (1--20) |
| `PROPAGATION_DELAY_MS` | `propagationDelayMs` | `10000` | Wait after topic deploy (ms) |
| `MAX_MEMORY_CHARS` | `maxMemoryChars` | `3000` | Memory injection budget (500--10000) |
| `MEMORY_ENABLED` | `memoryEnabled` | `true` | Enable cross-run learning |
| `ACCUMULATE_TESTS` | `accumulateTests` | `false` | Carry forward tests across iterations |
| `MAX_ACCUMULATED_TESTS` | `maxAccumulatedTests` | unlimited | Cap on accumulated test count |
| `DATA_DIR` | `dataDir` | `~/.daystrom/runs` | Run state directory |
| `MEMORY_DIR` | `memoryDir` | `~/.daystrom/memory` | Learning store directory |

!!! tip "Concurrency vs. rate limits"
    Keep `scanConcurrency` at 5 or lower to avoid AIRS rate limiting. Increase only if your tenant has elevated quotas.

!!! tip "Propagation delay"
    AIRS needs time to propagate topic changes. The default 10 seconds works for most cases. Reduce for faster iteration during development; increase if you see stale scan results.

## Data Locations

| Path | Purpose |
|------|---------|
| `~/.daystrom/config.json` | Persistent configuration |
| `~/.daystrom/runs/` | Saved run states (JSON per run) |
| `~/.daystrom/memory/` | Cross-run learnings (JSON per category) |
