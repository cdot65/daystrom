import type { Command } from 'commander';
import { loadConfig } from '../../config/loader.js';
import { createLlmProvider } from '../../llm/provider.js';
import { LangChainLlmService } from '../../llm/service.js';
import { AirsScanService } from '../../airs/scanner.js';
import { SdkManagementService } from '../../airs/management.js';
import { JsonFileStore } from '../../persistence/store.js';
import { runLoop } from '../../core/loop.js';
import { collectUserInput } from '../prompts.js';
import {
  renderHeader,
  renderIterationStart,
  renderTopic,
  renderTestProgress,
  renderMetrics,
  renderAnalysis,
  renderLoopComplete,
  renderError,
  renderIterationSummary,
} from '../renderer.js';

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
    .action(async (opts) => {
      try {
        renderHeader();

        const config = await loadConfig({
          llmProvider: opts.provider,
          llmModel: opts.model,
        });

        // Collect user input (interactive or from CLI flags)
        let userInput;
        if (opts.topic && opts.profile) {
          userInput = {
            topicDescription: opts.topic,
            intent: (opts.intent ?? 'block') as 'block' | 'allow',
            profileName: opts.profile,
            maxIterations: Number.parseInt(opts.maxIterations, 10),
            targetCoverage: Number.parseInt(opts.targetCoverage, 10) / 100,
          };
        } else {
          userInput = await collectUserInput();
        }

        // Initialize services
        const model = createLlmProvider({
          provider: config.llmProvider,
          model: config.llmModel,
          anthropicApiKey: config.anthropicApiKey,
          googleApiKey: config.googleApiKey,
          googleCloudProject: config.googleCloudProject,
          googleCloudLocation: config.googleCloudLocation,
          awsRegion: config.awsRegion,
        });

        const llm = new LangChainLlmService(model);
        const scanner = new AirsScanService(config.airsApiKey!);
        const management = new SdkManagementService({
          clientId: config.mgmtClientId,
          clientSecret: config.mgmtClientSecret,
          tsgId: config.mgmtTsgId,
          apiEndpoint: config.mgmtEndpoint,
          tokenEndpoint: config.mgmtTokenEndpoint,
        });

        const store = new JsonFileStore(config.dataDir);

        // Run the loop
        for await (const event of runLoop(userInput, {
          llm,
          management,
          scanner,
          propagationDelayMs: config.propagationDelayMs,
        })) {
          switch (event.type) {
            case 'iteration:start':
              renderIterationStart(event.iteration);
              break;
            case 'generate:complete':
              renderTopic(event.topic);
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
