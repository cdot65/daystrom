# Release Skill

Synchronized release: version bump + npm publish + GitHub release + Docker build trigger.

## Usage

```
/release [patch|minor|major]
```

Default: `patch` if no level given.

## Steps

Execute each step sequentially. Abort on any pre-flight failure. After tag push, each step is independently retryable — provide manual commands on failure.

### Pre-flight checks

Run these checks first. If ANY fail, abort with a clear message and do not proceed.

1. **Clean working tree**: Run `git status --porcelain`. If output is non-empty, abort: "Working tree is dirty. Commit or stash changes first."
2. **On main branch**: Run `git branch --show-current`. If not `main`, abort: "Must be on main branch to release."
3. **Lint**: Run `pnpm run lint`. Abort if exit code non-zero.
4. **Type-check**: Run `pnpm tsc --noEmit`. Abort if exit code non-zero.
5. **Tests**: Run `pnpm test`. Abort if exit code non-zero.
6. **npm auth**: Run `npm whoami`. If fails, abort: "Not logged into npm. Run `npm login` first."

### Version bump

7. Run `npm version <level> --no-git-tag-version` where `<level>` is the argument (patch/minor/major).
8. Read the new version from package.json.

### Changelog from changesets

9. Glob for `.changeset/*.md` files, excluding any `README.md`.
10. If changeset files exist:
    - Read each file
    - Extract the description text (everything after the closing `---` of the YAML frontmatter)
    - Concatenate all descriptions, separated by newlines, as the release notes
    - Delete the consumed changeset files
11. If no changeset files found: use `"Release v{version}"` as the release notes.

### Commit, tag, push

12. Stage changes: `git add package.json .changeset/`
13. Commit with message: `release: v{version}`
14. Create annotated tag: `git tag -a v{version} -m "v{version}"`
15. Push: `git push origin main --follow-tags`

### npm publish

16. Run `pnpm run build`
17. Run `npm publish --access public`
18. If publish fails with OTP error:
    - Print: "npm requires OTP. Run manually: `npm publish --access public --otp=<code>`"
    - Do NOT abort — continue to GitHub release step
19. If publish fails for other reasons: print the error and the manual retry command, continue.

### GitHub release

20. Run: `gh release create v{version} --title "v{version}" --notes "<release_notes>"`
    - Use the changeset-derived notes from step 10/11
    - Pass notes via heredoc to handle multiline content

### Docker (automatic)

21. The v* tag push in step 15 automatically triggers `.github/workflows/docker-publish.yml`.
22. No action needed — just report status.

### Summary

23. Print a summary:

```
Release v{version} complete!

npm:    https://www.npmjs.com/package/daystrom
GitHub: <release URL from gh output>
Docker: triggered by tag push — monitor with `gh run list -w docker-publish.yml`
```
