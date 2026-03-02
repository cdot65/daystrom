// Library entry point
export { runLoop } from './core/loop.js';
export type { LlmService, LoopDependencies } from './core/loop.js';
export { computeMetrics } from './core/metrics.js';
export { validateTopic, validateName, validateDescription, validateExamples } from './core/constraints.js';
export type { ValidationError } from './core/constraints.js';
export { LangChainLlmService } from './llm/service.js';
export { createLlmProvider } from './llm/provider.js';
export { AirsScanService } from './airs/scanner.js';
export { SdkManagementService } from './airs/management.js';
export { JsonFileStore } from './persistence/store.js';
export { loadConfig } from './config/loader.js';

export type {
  CustomTopic,
  UserInput,
  TestCase,
  TestResult,
  EfficacyMetrics,
  AnalysisReport,
  IterationResult,
  RunState,
  LoopEvent,
} from './core/types.js';
