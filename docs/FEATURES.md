# Features

## Core Capabilities

### Iterative Guardrail Refinement
Autonomous loop that generates, tests, evaluates, and improves custom topic definitions until a coverage target is met. Each iteration uses LLM analysis of false positives and negatives to inform improvements.

### Multi-Provider LLM Support
Pluggable LLM backend via LangChain.js:

| Provider | Model Default |
|----------|---------------|
| `claude-api` | claude-sonnet-4-20250514 |
| `claude-vertex` | claude-sonnet-4-20250514 |
| `claude-bedrock` | claude-sonnet-4-20250514 |
| `gemini-api` | gemini-2.0-flash |
| `gemini-vertex` | gemini-2.0-flash |
| `gemini-bedrock` | gemini-2.0-flash |

### Cross-Run Learning Memory
Insights from previous runs are persisted and injected into future LLM prompts. The system learns what topic definition strategies work and which degrade performance, improving initial generations over time.

- Keyword-based topic categorization with cross-topic transfer (≥50% overlap)
- Corroboration tracking — repeated observations are ranked higher
- Budget-aware injection — all learnings included, compacted when necessary
- Anti-pattern tracking — known failure modes explicitly surfaced

### Resumable Runs
Runs can be paused and resumed from the last iteration. Full state (topic history, metrics, analysis) is persisted to disk.

### Automated Test Generation
Each iteration generates balanced positive (should trigger) and negative (should not trigger) test cases via LLM. Tests are scanned through the AIRS API with configurable concurrency.

### Comprehensive Metrics
- **TPR** — true positive rate (sensitivity)
- **TNR** — true negative rate (specificity)
- **Coverage** — min(TPR, TNR), the primary optimization target
- **Accuracy** — overall correctness
- **F1** — harmonic mean of precision and recall

### Topic Constraint Enforcement
Automatic validation and clamping to AIRS limits:
- Name: ≤100 characters
- Description: ≤250 characters
- Each example: ≤250 characters
- Max 5 examples
- Combined total: ≤1000 characters

## Configuration Reference

### CLI Flags (`guardrail-gen generate`)

| Flag | Description | Default |
|------|-------------|---------|
| `--provider <name>` | LLM provider | `claude-api` |
| `--model <name>` | LLM model override | provider default |
| `--profile <name>` | AIRS security profile | (prompted) |
| `--topic <desc>` | Topic description | (prompted) |
| `--intent <block\|allow>` | Detection intent | `block` |
| `--max-iterations <n>` | Loop iteration limit | `20` |
| `--target-coverage <n>` | Coverage % target | `90` |
| `--no-memory` | Disable learning memory | enabled |

### Environment Variables

See [`.env.example`](../.env.example) for the full list with comments.

### Config File

Optional JSON at `~/.prisma-airs-guardrails/config.json`. Same keys as the Zod schema (camelCase). Overridden by env vars and CLI flags.

## Testing

108 tests across 13 files:

```bash
pnpm test              # Run all
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

Test categories:
- **Unit** — metrics, constraints, schemas, providers, memory store/extractor/injector/diff, persistence, scanner, management
- **Integration** — full loop with mocked AIRS services
