# Environment Variables

All environment variables used by Daystrom, grouped by category. See `.env.example` for a template.

---

## LLM Provider

| Variable | Required For | Description |
|----------|-------------|-------------|
| `LLM_PROVIDER` | All | Provider selection (`claude-api`, `claude-vertex`, `claude-bedrock`, `gemini-api`, `gemini-vertex`, `gemini-bedrock`) |
| `LLM_MODEL` | -- | Override default model for any provider |
| `ANTHROPIC_API_KEY` | `claude-api` | Anthropic API key (`sk-ant-...`) |
| `GOOGLE_API_KEY` | `gemini-api` | Google AI API key |
| `GOOGLE_CLOUD_PROJECT` | `claude-vertex`, `gemini-vertex` | GCP project ID |
| `GOOGLE_CLOUD_LOCATION` | `claude-vertex`, `gemini-vertex` | GCP region (default: `us-central1`; claude-vertex uses `global`) |
| `AWS_REGION` | `claude-bedrock`, `gemini-bedrock` | AWS region (default: `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | `claude-bedrock`*, `gemini-bedrock`* | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | `claude-bedrock`*, `gemini-bedrock`* | IAM secret key |

!!! note
    *AWS key variables are not required if using the AWS default credential chain (instance roles, SSO, etc.).

---

## Scan API

| Variable | Required | Description |
|----------|----------|-------------|
| `PANW_AI_SEC_API_KEY` | Yes* | AI Security scan API key |
| `PANW_AI_SEC_API_TOKEN` | -- | Alternative: bearer token |
| `PANW_AI_SEC_PROFILE_NAME` | -- | Default profile name |
| `PANW_AI_SEC_API_ENDPOINT` | -- | Custom endpoint (default: `https://service.api.aisecurity.paloaltonetworks.com`) |

!!! info
    *Either `PANW_AI_SEC_API_KEY` or `PANW_AI_SEC_API_TOKEN` is required.

---

## Management API

| Variable | Required | Description |
|----------|----------|-------------|
| `PANW_MGMT_CLIENT_ID` | Yes | OAuth2 client ID |
| `PANW_MGMT_CLIENT_SECRET` | Yes | OAuth2 client secret |
| `PANW_MGMT_TSG_ID` | Yes | Tenant Service Group ID |
| `PANW_MGMT_ENDPOINT` | -- | Custom management endpoint |
| `PANW_MGMT_TOKEN_ENDPOINT` | -- | Custom token endpoint |

---

## Tuning

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `SCAN_CONCURRENCY` | `5` | 1--20 | Parallel scan requests per batch |
| `PROPAGATION_DELAY_MS` | `10000` | >=0 | Wait after topic deploy (ms) |
| `MAX_MEMORY_CHARS` | `3000` | 500--10000 | Memory injection character budget |
| `MEMORY_ENABLED` | `true` | -- | Enable/disable memory system |

!!! warning
    `SCAN_CONCURRENCY` above 5 may trigger AIRS rate limits. Increase with caution.

---

## Paths

| Variable | Default | Description |
|----------|---------|-------------|
| `DATA_DIR` | `~/.daystrom/runs` | Run state persistence directory |
| `MEMORY_DIR` | `~/.daystrom/memory` | Learning store directory |

!!! tip
    The `~` prefix is expanded to `$HOME` automatically.
