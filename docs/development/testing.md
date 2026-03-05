# Testing

## Running Tests

```bash
pnpm test              # All unit/integration tests
pnpm run test:watch    # Watch mode
pnpm run test:coverage # Coverage report (v8 provider)
pnpm run test:e2e      # E2E tests (requires real creds)
pnpm tsc --noEmit      # Type-check (strict mode)
```

## Test Structure

Tests live in `tests/`, mirroring the `src/` layout:

```
tests/
├── unit/                  16 spec files
│   ├── airs/              scanner.spec.ts, management.spec.ts
│   ├── config/            schema.spec.ts, loader.spec.ts
│   ├── core/              loop.spec.ts, metrics.spec.ts, constraints.spec.ts
│   ├── llm/               provider.spec.ts, schemas.spec.ts, service.spec.ts, prompts.spec.ts
│   ├── memory/            store.spec.ts, extractor.spec.ts, injector.spec.ts, diff.spec.ts
│   └── persistence/       store.spec.ts
├── integration/           loop.integration.spec.ts
├── e2e/                   vertex-provider.e2e.spec.ts (opt-in)
└── helpers/               mocks.ts
```

## Mocking

- **MSW** (Mock Service Worker) intercepts HTTP requests -- no real AIRS credentials needed
- Unit and integration tests run fully offline
- E2E tests require real Vertex AI credentials (opt-in via separate config)

!!! info "No credentials needed for unit tests"
    All HTTP calls to AIRS and LLM APIs are intercepted by MSW handlers defined in `tests/helpers/mocks.ts`. You can run the full unit/integration suite without any API keys.

## Coverage

Coverage is collected via the **V8** provider and excludes files that are not meaningfully testable:

| Excluded pattern | Reason |
|-----------------|--------|
| `src/cli/**` | Interactive UI (prompts, rendering) |
| `src/index.ts` | Re-exports only |
| `**/types.ts` | Type-only files, no runtime code |

```bash
pnpm run test:coverage
```

## Running Specific Tests

Run a single test file:

```bash
pnpm test -- tests/unit/core/metrics.spec.ts
```

Run tests matching a name pattern:

```bash
pnpm test -- -t "computes coverage as min of TPR and TNR"
```

!!! tip "Watch a single file"
    ```bash
    pnpm run test:watch -- tests/unit/core/metrics.spec.ts
    ```
