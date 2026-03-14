---
"@cdot65/prisma-airs-cli": patch
---

Fix allow-intent detection: use `category` field (`benign`/`malicious`) instead of broken `action === 'allow'` heuristic. Fix profile guardrail-level action to always be `block`. Add `--debug-scans` flag for raw AIRS response inspection.
