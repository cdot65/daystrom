import type { EfficacyMetrics, TestResult } from './types.js';

export function computeMetrics(results: TestResult[]): EfficacyMetrics {
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const r of results) {
    if (r.testCase.expectedTriggered && r.actualTriggered) truePositives++;
    else if (!r.testCase.expectedTriggered && !r.actualTriggered) trueNegatives++;
    else if (!r.testCase.expectedTriggered && r.actualTriggered) falsePositives++;
    else if (r.testCase.expectedTriggered && !r.actualTriggered) falseNegatives++;
  }

  const totalPositives = truePositives + falseNegatives;
  const totalNegatives = trueNegatives + falsePositives;
  const total = results.length;

  const truePositiveRate = totalPositives > 0 ? truePositives / totalPositives : 0;
  const trueNegativeRate = totalNegatives > 0 ? trueNegatives / totalNegatives : 0;
  const accuracy = total > 0 ? (truePositives + trueNegatives) / total : 0;
  const coverage = Math.min(truePositiveRate, trueNegativeRate);

  const precision = truePositives + falsePositives > 0
    ? truePositives / (truePositives + falsePositives)
    : 0;
  const recall = truePositiveRate;
  const f1Score = precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0;

  return {
    truePositives,
    trueNegatives,
    falsePositives,
    falseNegatives,
    truePositiveRate,
    trueNegativeRate,
    accuracy,
    coverage,
    f1Score,
  };
}
