# Release Notes

## v1.0.0

First stable release of Daystrom.

### Highlights

- **Core iterative refinement loop** with async generator architecture
- **6 LLM providers**: Claude (API, Vertex, Bedrock) and Gemini (API, Vertex, Bedrock)
- **Cross-run learning memory** with keyword categorization and budget-aware prompt injection
- **AIRS integration** -- topic CRUD via Management API, batch scanning via Scan API
- **4 CLI commands**: `generate`, `resume`, `report`, `list`
- **Automatic topic constraint clamping** for AIRS limits
- **Comprehensive metrics**: TPR, TNR, coverage, accuracy, F1
- **Resumable runs** with full state persistence
- **192 tests** across 17 spec files
- **Full documentation site** at [cdot65.github.io/daystrom](https://cdot65.github.io/daystrom/)
- **Docker support** with multi-arch images (amd64 + arm64)

## v0.1.0 -- Initial Release

The first public release of Daystrom: an automated CLI for generating, testing, and iteratively refining Palo Alto Prisma AIRS custom topic guardrails.

### Highlights

- **Core iterative refinement loop** with async generator architecture (`runLoop()` yields typed `LoopEvent` discriminated unions)
- **6 LLM providers** supported: Claude (API, Vertex, Bedrock) and Gemini (API, Vertex, Bedrock)
- **Cross-run learning memory** with keyword categorization and budget-aware prompt injection
- **AIRS integration** -- topic CRUD via Management API, batch scanning via Scan API
- **4 CLI commands**: `generate`, `resume`, `report`, `list`
- **Automatic topic constraint clamping** for AIRS limits (100 char name, 250 char description, 250 char/example, 5 examples max, 1000 char combined)
- **Comprehensive metrics**: TPR, TNR, coverage, accuracy, F1
- **Resumable runs** with full state persistence to `~/.daystrom/runs/`
- **165+ tests** with ~98% statement coverage

### Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| AsyncGenerator loop | Enables streaming events to CLI renderer, pause/resume, and decoupled orchestration |
| Structured LLM output (Zod) | Guarantees type-safe topic definitions with automatic retry on parse failure |
| MSW for test mocking | Fully offline test suite, no AIRS credentials needed |
| File-based memory | Simple persistence, no database dependency, human-readable JSON |
