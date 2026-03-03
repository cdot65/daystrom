import type { Command } from 'commander';
import { loadConfig } from '../../config/loader.js';
import { JsonFileStore } from '../../persistence/store.js';
import { renderError, renderHeader, renderRunList } from '../renderer.js';

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List all saved runs')
    .action(async () => {
      try {
        renderHeader();
        const config = await loadConfig();
        const store = new JsonFileStore(config.dataDir);
        const runs = await store.list();
        renderRunList(runs);
      } catch (err) {
        renderError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
