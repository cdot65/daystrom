import type { CustomTopic, EfficacyMetrics } from '../core/types.js';

export interface IterationDiff {
  fromIteration: number;
  toIteration: number;
  descriptionChanged: boolean;
  examplesChanged: boolean;
  examplesAdded: string[];
  examplesRemoved: string[];
  descriptionBefore: string;
  descriptionAfter: string;
  metricDelta: {
    coverage: number;
    tpr: number;
    tnr: number;
    accuracy: number;
    f1: number;
  };
}

export interface Learning {
  id: string;
  runId: string;
  extractedAt: string;
  topicCategory: string;
  topicDescription: string;
  insight: string;
  strategy: string;
  outcome: 'improved' | 'degraded' | 'neutral';
  changeType: 'description-only' | 'examples-only' | 'both' | 'initial';
  metrics: {
    coverage: number;
    tpr: number;
    tnr: number;
    accuracy: number;
    f1: number;
  };
  corroborations: number;
  tags: string[];
}

export interface TopicMemory {
  category: string;
  updatedAt: string;
  learnings: Learning[];
  bestKnown: {
    runId: string;
    iteration: number;
    topic: CustomTopic;
    metrics: EfficacyMetrics;
  } | null;
  antiPatterns: string[];
}
