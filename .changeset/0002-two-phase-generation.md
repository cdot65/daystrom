---
"@cdot65/daystrom": minor
---

Added two-phase generation for block-intent guardrail runs. AIRS profiles with default action "block" require a companion allow topic — the loop now auto-generates one via LLM before the main block topic refinement. Also added `assignTopicsToProfile()` for multi-topic profile wiring.
