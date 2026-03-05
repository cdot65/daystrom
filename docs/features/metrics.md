# Metrics & Evaluation

Each iteration computes efficacy metrics from test results to measure guardrail quality and guide improvement.

## Metrics Reference

| Metric | Formula | Description |
|--------|---------|-------------|
| **TPR** | `TP / (TP + FN)` | True positive rate / sensitivity — fraction of violations correctly detected |
| **TNR** | `TN / (TN + FP)` | True negative rate / specificity — fraction of benign prompts correctly passed |
| **Coverage** | `min(TPR, TNR)` | Primary optimization target — ensures both detection and specificity improve together |
| **Accuracy** | `(TP + TN) / total` | Overall correctness across all test cases |
| **F1** | `2 * (precision * recall) / (precision + recall)` | Harmonic mean of precision and recall |

!!! important "Why Coverage = min(TPR, TNR)"
    Optimizing TPR alone leads to overly broad guardrails that block benign prompts. Optimizing TNR alone leads to guardrails that miss violations. Coverage forces both to improve in tandem — the guardrail must be both sensitive and specific.

## Test Generation

Each iteration generates a balanced test suite via the LLM:

- **Positive tests** — prompts that _should_ trigger the guardrail (true violations)
- **Negative tests** — prompts that _should not_ trigger (benign, topically related but non-violating)

Each test case contains:

| Field | Type | Description |
|-------|------|-------------|
| `prompt` | `string` | The test prompt text |
| `expectedTriggered` | `boolean` | Whether the guardrail should detect this |
| `category` | `string` | Label for grouping (e.g., `"direct-request"`, `"benign-adjacent"`) |

!!! tip
    The LLM generates adversarial negative tests that are topically adjacent to the guardrail — these are the hardest cases for the model to get right and drive the most improvement.

## Scanning

Test prompts are scanned against AIRS in batches using the Scanner API.

```mermaid
graph LR
    A[Test Cases] --> B[scanBatch]
    B --> C[p-limit concurrency=5]
    C --> D[Scanner.syncScan]
    D --> E[TestResult[]]
```

- Concurrency controlled via `p-limit` (default 5, configurable via `scanConcurrency`)
- Detection check: `prompt_detected.topic_violation` field
- Fallback: `topic_guardrails_details` if primary field absent

!!! warning "Rate Limiting"
    Setting `scanConcurrency` above 5 risks hitting AIRS API rate limits. The default of 5 balances throughput and reliability.

## FP/FN Analysis

After each scan batch, the LLM receives:

1. The current topic definition (name, description, examples)
2. All test results with expected vs. actual outcomes
3. Computed metrics

The LLM then produces an `AnalysisReport` identifying:

| Pattern Type | Cause | Example |
|-------------|-------|---------|
| **False positives** | Description too broad, ambiguous examples | Benign cooking discussion flagged by "weapons" guardrail due to "knife" in examples |
| **False negatives** | Description too narrow, missing edge cases | Coded language or indirect references not caught |

Each analysis includes concrete improvement suggestions applied in the next iteration.

## Stop Conditions

The loop terminates when either condition is met:

| Condition | Default | Description |
|-----------|---------|-------------|
| `coverage >= targetCoverage` | `0.9` (90%) | Target reached — run succeeds |
| `iteration >= maxIterations` | `20` | Budget exhausted — run completes with best result |

!!! note
    The best iteration (highest coverage) is tracked regardless of when the loop stops. Even if the final iteration regresses, the best result is preserved.
