import type { RunState } from '../core/types.js';

export interface RunStore {
  save(run: RunState): Promise<void>;
  load(id: string): Promise<RunState | null>;
  list(): Promise<RunStateSummary[]>;
  delete(id: string): Promise<void>;
}

export interface RunStateSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: RunState['status'];
  currentIteration: number;
  bestCoverage: number;
  topicDescription: string;
}
