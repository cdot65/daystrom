# Contributing

## Branch Naming

Prefix personal branches with `cdot65/`:

```bash
git checkout -b cdot65/feature-name
```

## Code Style

- **Biome** handles both linting and formatting
- TypeScript strict mode is enabled project-wide

```bash
pnpm run lint       # Check for lint issues
pnpm run lint:fix   # Auto-fix lint issues
pnpm run format     # Format all files
```

!!! tip "Run all checks before committing"
    ```bash
    pnpm run lint && pnpm tsc --noEmit && pnpm test
    ```

## Development Workflow

1. Fork and clone the repo
2. `pnpm install`
3. Create a feature branch (`cdot65/your-feature`)
4. Make changes
5. Run checks: `pnpm run lint && pnpm tsc --noEmit && pnpm test`
6. Commit and push
7. Open a PR against `main`

## PR Guidelines

- Keep PRs focused on a single change
- Include tests for new functionality
- Ensure all CI checks pass (lint, typecheck, test, docs build)
- Update documentation if behavior changes

!!! warning "CI Requirements"
    All of the following must pass before merge:

    - Biome lint (`pnpm run lint`)
    - Biome format check (`pnpm run format:check`)
    - TypeScript type-check (`pnpm tsc --noEmit`)
    - Full test suite (`pnpm test`)
    - Docs build (if docs changed)

## Commit Messages

- Use concise commit messages
- Start with a verb: `add`, `fix`, `update`, `refactor`, etc.

| Prefix | Use case |
|--------|----------|
| `add` | New feature or file |
| `fix` | Bug fix |
| `update` | Enhancement to existing feature |
| `refactor` | Code restructuring, no behavior change |
| `docs` | Documentation only |
| `test` | Test additions or fixes |
