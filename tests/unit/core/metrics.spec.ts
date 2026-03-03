import { describe, expect, it } from 'vitest';
import { computeMetrics } from '../../../src/core/metrics.js';
import type { TestResult } from '../../../src/core/types.js';

function makeResult(expected: boolean, actual: boolean): TestResult {
  return {
    testCase: { prompt: 'test', expectedTriggered: expected, category: 'test' },
    actualTriggered: actual,
    scanAction: actual ? 'block' : 'allow',
    scanId: 'scan-1',
    reportId: 'report-1',
    correct: expected === actual,
  };
}

describe('metrics', () => {
  describe('computeMetrics', () => {
    it('computes perfect scores for all-correct results', () => {
      const results: TestResult[] = [
        makeResult(true, true),
        makeResult(true, true),
        makeResult(false, false),
        makeResult(false, false),
      ];
      const m = computeMetrics(results);
      expect(m.truePositives).toBe(2);
      expect(m.trueNegatives).toBe(2);
      expect(m.falsePositives).toBe(0);
      expect(m.falseNegatives).toBe(0);
      expect(m.truePositiveRate).toBe(1);
      expect(m.trueNegativeRate).toBe(1);
      expect(m.accuracy).toBe(1);
      expect(m.coverage).toBe(1);
      expect(m.f1Score).toBe(1);
    });

    it('computes zero scores for all-wrong results', () => {
      const results: TestResult[] = [
        makeResult(true, false),
        makeResult(true, false),
        makeResult(false, true),
        makeResult(false, true),
      ];
      const m = computeMetrics(results);
      expect(m.truePositives).toBe(0);
      expect(m.trueNegatives).toBe(0);
      expect(m.falsePositives).toBe(2);
      expect(m.falseNegatives).toBe(2);
      expect(m.truePositiveRate).toBe(0);
      expect(m.trueNegativeRate).toBe(0);
      expect(m.accuracy).toBe(0);
      expect(m.coverage).toBe(0);
      expect(m.f1Score).toBe(0);
    });

    it('handles mixed results correctly', () => {
      const results: TestResult[] = [
        makeResult(true, true), // TP
        makeResult(true, false), // FN
        makeResult(false, false), // TN
        makeResult(false, true), // FP
      ];
      const m = computeMetrics(results);
      expect(m.truePositives).toBe(1);
      expect(m.trueNegatives).toBe(1);
      expect(m.falsePositives).toBe(1);
      expect(m.falseNegatives).toBe(1);
      expect(m.truePositiveRate).toBe(0.5);
      expect(m.trueNegativeRate).toBe(0.5);
      expect(m.accuracy).toBe(0.5);
      expect(m.coverage).toBe(0.5);
      expect(m.f1Score).toBe(0.5);
    });

    it('handles empty results', () => {
      const m = computeMetrics([]);
      expect(m.truePositives).toBe(0);
      expect(m.accuracy).toBe(0);
      expect(m.coverage).toBe(0);
      expect(m.f1Score).toBe(0);
    });

    it('handles only positives (no negatives)', () => {
      const results: TestResult[] = [makeResult(true, true), makeResult(true, true)];
      const m = computeMetrics(results);
      expect(m.truePositiveRate).toBe(1);
      expect(m.trueNegativeRate).toBe(0);
      expect(m.coverage).toBe(0); // min(TPR, TNR)
    });

    it('handles only negatives (no positives)', () => {
      const results: TestResult[] = [makeResult(false, false), makeResult(false, false)];
      const m = computeMetrics(results);
      expect(m.truePositiveRate).toBe(0);
      expect(m.trueNegativeRate).toBe(1);
      expect(m.coverage).toBe(0); // min(TPR, TNR)
    });

    it('computes F1 correctly for imbalanced results', () => {
      // 3 TP, 0 FN, 0 FP, 7 TN
      const results: TestResult[] = [
        ...Array(3)
          .fill(null)
          .map(() => makeResult(true, true)),
        ...Array(7)
          .fill(null)
          .map(() => makeResult(false, false)),
      ];
      const m = computeMetrics(results);
      expect(m.truePositives).toBe(3);
      expect(m.trueNegatives).toBe(7);
      expect(m.falsePositives).toBe(0);
      expect(m.falseNegatives).toBe(0);
      expect(m.accuracy).toBe(1);
      expect(m.f1Score).toBe(1);
    });
  });
});
