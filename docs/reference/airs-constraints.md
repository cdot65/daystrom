# AIRS Constraints

Prisma AIRS enforces hard limits on custom topic definitions. Daystrom validates and auto-clamps topics to fit within these boundaries.

---

## Limits

| Constraint | Limit |
|-----------|-------|
| Topic name | 100 characters max |
| Description | 250 characters max |
| Each example | 250 characters max |
| Number of examples | 2--5 |
| Combined total (description + all examples) | 1000 characters max |

!!! warning "Byte length"
    The combined total is calculated using **UTF-8 byte length**, not character count. Multi-byte characters (emoji, CJK, accented letters) consume more than one unit toward the 1000 limit.

---

## Automatic Clamping

`clampTopic()` in `src/llm/service.ts` enforces limits after every LLM response:

1. **Truncate name** to 100 characters
2. **Truncate each example** to 250 characters
3. **If combined > 1000**: drop trailing examples one at a time
4. **If still over**: truncate description to fit remaining budget

```
LLM output → clampTopic() → AIRS-compliant topic
```

### Why Post-LLM Clamping?

The LLM routinely exceeds the 250-char description limit when generating natural language descriptions. Constraining via Zod schema validation alone would reject otherwise valid responses. Post-processing allows the LLM to generate freely while guaranteeing AIRS compatibility.

!!! note
    Constraints are defined in `src/core/constraints.ts` and imported by the LLM service and test suites.

---

## Profile Integration

Topics are deployed into an AIRS security profile following this structure:

```
profile
└── model-protection
    └── topic-guardrails
        └── topic-list
            └── [your custom topic]
```

### Key Behaviors

- **Profile updates create new revisions** with new UUIDs. Always reference profiles by **name**, never by ID.
- **Topics cannot be deleted** while referenced by any profile revision.
- After deploying a topic, Daystrom waits `propagationDelayMs` (default: 10 seconds) before scanning to allow AIRS propagation.

!!! danger "Do not reference profiles by UUID"
    Each profile update generates a new revision with a new UUID. Storing or referencing a profile by its UUID will break on the next update. Use the profile **name** as the stable identifier.
