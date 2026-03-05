# Configuration Options

Daystrom resolves configuration through a four-level cascade, validated by a Zod schema with coercion and defaults.

---

## Config Cascade

Priority (highest wins):

1. **CLI flags** (`--provider`, `--model`, etc.)
2. **Environment variables** (`LLM_PROVIDER`, `LLM_MODEL`, etc.)
3. **Config file** (`~/.daystrom/config.json`)
4. **Zod schema defaults**

!!! info
    The `~` prefix in any path value is expanded to `$HOME` at load time via `expandHome()`.

---

## Config File

Optional JSON file at `~/.daystrom/config.json`. Keys use camelCase matching the Zod `ConfigSchema`.

```json
{
  "llmProvider": "claude-api",
  "llmModel": "claude-opus-4-6",
  "scanConcurrency": 3,
  "propagationDelayMs": 15000,
  "maxMemoryChars": 5000,
  "memoryEnabled": true,
  "dataDir": "~/.daystrom/runs",
  "memoryDir": "~/.daystrom/memory"
}
```

---

## All Configuration Fields

| Field | CLI Flag | Env Var | Default | Description |
|-------|----------|---------|---------|-------------|
| `llmProvider` | `--provider` | `LLM_PROVIDER` | `claude-api` | LLM provider selection |
| `llmModel` | `--model` | `LLM_MODEL` | per-provider | Model override |
| `scanConcurrency` | -- | `SCAN_CONCURRENCY` | `5` | Parallel scan requests (1--20) |
| `propagationDelayMs` | -- | `PROPAGATION_DELAY_MS` | `10000` | Wait after topic deploy (ms) |
| `maxMemoryChars` | -- | `MAX_MEMORY_CHARS` | `3000` | Memory injection budget (500--10000) |
| `memoryEnabled` | `--no-memory` | `MEMORY_ENABLED` | `true` | Enable cross-run learning |
| `dataDir` | -- | `DATA_DIR` | `~/.daystrom/runs` | Run state directory |
| `memoryDir` | -- | `MEMORY_DIR` | `~/.daystrom/memory` | Learning store directory |

### Provider Default Models

| Provider | Default Model |
|----------|--------------|
| `claude-api` | `claude-opus-4-6` |
| `claude-vertex` | `claude-opus-4-6` |
| `claude-bedrock` | `anthropic.claude-opus-4-6-v1` |
| `gemini-api` | per-provider default |
| `gemini-vertex` | per-provider default |
| `gemini-bedrock` | per-provider default |

!!! warning "Concurrency tuning"
    Setting `scanConcurrency` above 5 risks rate limiting from the AIRS scan API. Increase cautiously.

!!! note "Propagation delay"
    AIRS requires time to propagate topic changes after create/update. The default 10 seconds is usually sufficient; increase if tests consistently fail immediately after deployment.
