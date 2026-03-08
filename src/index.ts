/**
 * Daystrom — Public library API
 *
 * Automated generation, testing, and iterative refinement of
 * Palo Alto Prisma AIRS custom topic guardrails.
 */

// ---------------------------------------------------------------------------
// AIRS integration — scan prompts and manage topics/profiles via SDK
// ---------------------------------------------------------------------------
export { SdkManagementService } from './airs/management.js';
export { SdkPromptSetService } from './airs/promptsets.js';
export { SdkRedTeamService } from './airs/redteam.js';
export { AirsScanService } from './airs/scanner.js';
// ---------------------------------------------------------------------------
// Core loop & metrics — the main generate→test→evaluate→improve cycle
// ---------------------------------------------------------------------------
export type {
  RedTeamAttack,
  RedTeamCategory,
  RedTeamCustomAttack,
  RedTeamCustomReport,
  RedTeamJob,
  RedTeamService,
  RedTeamStaticReport,
  RedTeamTarget,
} from './airs/types.js';
// ---------------------------------------------------------------------------
// Config — cascading config loader (CLI > env > file > Zod defaults)
// ---------------------------------------------------------------------------
export { loadConfig } from './config/loader.js';
// ---------------------------------------------------------------------------
// AIRS constraints — validation helpers enforcing Prisma AIRS topic limits
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// LLM — provider factory and structured-output service for topic generation
// ---------------------------------------------------------------------------
export { createLlmProvider } from './llm/provider.js';
export { LangChainLlmService } from './llm/service.js';

// ---------------------------------------------------------------------------
// Memory — cross-run learning persistence, extraction, and prompt injection
// ---------------------------------------------------------------------------
export { LearningExtractor } from './memory/extractor.js';
export { MemoryInjector } from './memory/injector.js';
export { MemoryStore, normalizeCategory } from './memory/store.js';
export type {
  IterationDiff,
  Learning,
  TopicMemory,
} from './memory/types.js';

// ---------------------------------------------------------------------------
// Persistence — save/load/list run state as JSON for resume & reporting
// ---------------------------------------------------------------------------
export { JsonFileStore } from './persistence/store.js';
