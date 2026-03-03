// Library entry point

export { SdkManagementService } from './airs/management.js';
export { AirsScanService } from './airs/scanner.js';
export { loadConfig } from './config/loader.js';
export type { ValidationError } from './core/constraints.js';
export {
  validateDescription,
  validateExamples,
  validateName,
  validateTopic,
} from './core/constraints.js';
export type { LlmService, LoopDependencies } from './core/loop.js';
export { runLoop } from './core/loop.js';
export { computeMetrics } from './core/metrics.js';
export type {
  AnalysisReport,
  CustomTopic,
  EfficacyMetrics,
  IterationResult,
  LoopEvent,
  RunState,
  TestCase,
  TestResult,
  UserInput,
} from './core/types.js';
export { createLlmProvider } from './llm/provider.js';
export { LangChainLlmService } from './llm/service.js';
export { LearningExtractor } from './memory/extractor.js';
export { MemoryInjector } from './memory/injector.js';
export { MemoryStore, normalizeCategory } from './memory/store.js';
export type {
  IterationDiff,
  Learning,
  TopicMemory,
} from './memory/types.js';
export { JsonFileStore } from './persistence/store.js';
