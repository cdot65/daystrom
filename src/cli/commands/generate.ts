import type { Command } from 'commander';
import { SdkManagementService } from '../../airs/management.js';
import { AirsScanService } from '../../airs/scanner.js';
import { loadConfig } from '../../config/loader.js';
import { runLoop } from '../../core/loop.js';
import type { UserInput } from '../../core/types.js';
import { createLlmProvider } from '../../llm/provider.js';
import { LangChainLlmService } from '../../llm/service.js';
import { LearningExtractor } from '../../memory/extractor.js';
import { MemoryInjector } from '../../memory/injector.js';
import { MemoryStore } from '../../memory/store.js';
import { JsonFileStore } from '../../persistence/store.js';
import { collectUserInput } from '../prompts.js';
import {
  renderAnalysis,
  renderError,
  renderHeader,
  renderIterationStart,
  renderIterationSummary,
  renderLoopComplete,
  renderMemoryExtracted,
  renderMemoryLoaded,
  renderMetrics,
  renderTestProgress,
  renderTestsAccumulated,
  renderTopic,
} from '../renderer.js';

/** Register the `generate` command — starts a new guardrail generation loop. */
export function registerGenerateCommand(program: Command): void {
  program
    .command('generate')
    .description('Start a new guardrail generation loop')
    .option('--provider <provider>', 'LLM provider')
    .option('--model <model>', 'LLM model name')
    .option('--profile <name>', 'AIRS security profile name')
    .option('--topic <description>', 'Topic description')
    .option('--intent <intent>', 'Intent: block or allow')
    .option('--max-iterations <n>', 'Max iterations', '20')
    .option('--target-coverage <n>', 'Target coverage %', '90')
    .option('--accumulate-tests', 'Carry forward test prompts across iterations', false)
    .option('--max-accumulated-tests <n>', 'Max accumulated test count cap')
    .option('--memory', 'Enable learning memory (default)')
    .option('--no-memory', 'Disable learning memory')
    .action(async (opts) => {
      try {
        renderHeader();

        const config = await loadConfig({
          llmProvider: opts.provider,
          llmModel: opts.model,
          memoryEnabled: opts.memory !== undefined ? String(opts.memory) : undefined,
        });

        // Collect user input (interactive or from CLI flags)
        let userInput: UserInput;
        if (opts.topic && opts.profile) {
          userInput = {
            topicDescription: opts.topic,
            intent: (opts.intent ?? 'block') as 'block' | 'allow',
            profileName: opts.profile,
            maxIterations: Number.parseInt(opts.maxIterations, 10),
            targetCoverage: Number.parseInt(opts.targetCoverage, 10) / 100,
            accumulateTests: opts.accumulateTests ?? false,
            maxAccumulatedTests: opts.maxAccumulatedTests
              ? Number.parseInt(opts.maxAccumulatedTests, 10)
              : undefined,
          };
        } else {
          userInput = await collectUserInput();
        }

        // Initialize services
        const model = await createLlmProvider({
          provider: config.llmProvider,
          model: config.llmModel,
          anthropicApiKey: config.anthropicApiKey,
          googleApiKey: config.googleApiKey,
          googleCloudProject: config.googleCloudProject,
          googleCloudLocation: config.googleCloudLocation,
          awsRegion: config.awsRegion,
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
        });

        // Set up memory system
        const memoryEnabled = config.memoryEnabled;
        const memoryStore = memoryEnabled ? new MemoryStore(config.memoryDir) : undefined;
        const memoryInjector = memoryStore
          ? new MemoryInjector(memoryStore, config.maxMemoryChars)
          : undefined;

        const llm = new LangChainLlmService(model, memoryInjector);
        if (!config.airsApiKey) throw new Error('PANW_AI_SEC_API_KEY is required');
        const scanner = new AirsScanService(config.airsApiKey);
        const management = new SdkManagementService({
          clientId: config.mgmtClientId,
          clientSecret: config.mgmtClientSecret,
          tsgId: config.mgmtTsgId,
          apiEndpoint: config.mgmtEndpoint,
          tokenEndpoint: config.mgmtTokenEndpoint,
        });

        const store = new JsonFileStore(config.dataDir);

        // Load memory before loop
        if (memoryEnabled) {
          const learningCount = await llm.loadMemory(userInput.topicDescription);
          renderMemoryLoaded(learningCount);
        }

        const memoryExtractor = memoryStore ? new LearningExtractor(model, memoryStore) : undefined;

        // Run the loop
        for await (const event of runLoop(userInput, {
          llm,
          management,
          scanner,
          propagationDelayMs: config.propagationDelayMs,
          memory: memoryExtractor ? { extractor: memoryExtractor } : undefined,
        })) {
          switch (event.type) {
            case 'iteration:start':
              renderIterationStart(event.iteration);
              break;
            case 'generate:complete':
              renderTopic(event.topic);
              break;
            case 'tests:accumulated':
              renderTestsAccumulated(event.newCount, event.totalCount, event.droppedCount);
              break;
            case 'test:progress':
              renderTestProgress(event.completed, event.total);
              break;
            case 'evaluate:complete':
              renderMetrics(event.metrics);
              break;
            case 'analyze:complete':
              renderAnalysis(event.analysis);
              break;
            case 'iteration:complete':
              renderIterationSummary(event.result);
              break;
            case 'memory:extracted':
              renderMemoryExtracted(event.learningCount);
              break;
            case 'loop:complete':
              await store.save(event.runState);
              renderLoopComplete(event.runState);
              break;
          }
        }
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
