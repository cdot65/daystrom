import { RedTeamClient, type RedTeamClientOptions } from '@cdot65/prisma-airs-sdk';
import type { PromptSetService } from './types.js';

/**
 * Wraps the SDK's RedTeamClient.customAttacks to implement PromptSetService.
 * Creates and populates custom prompt sets for AI Red Team.
 */
export class SdkPromptSetService implements PromptSetService {
  private client: RedTeamClient;

  constructor(opts?: RedTeamClientOptions) {
    this.client = new RedTeamClient(opts);
  }

  async createPromptSet(
    name: string,
    description?: string,
  ): Promise<{ uuid: string; name: string }> {
    const response = await this.client.customAttacks.createPromptSet({
      name,
      ...(description ? { description } : {}),
    });
    return { uuid: response.uuid, name: response.name };
  }

  async addPrompt(
    promptSetId: string,
    prompt: string,
    goal?: string,
  ): Promise<{ uuid: string; prompt: string }> {
    const response = await this.client.customAttacks.createPrompt({
      prompt,
      prompt_set_id: promptSetId,
      ...(goal ? { goal } : {}),
    });
    return { uuid: response.uuid, prompt: response.prompt };
  }

  async listPromptSets(): Promise<Array<{ uuid: string; name: string; active: boolean }>> {
    const response = await this.client.customAttacks.listPromptSets();
    return (response.data ?? []).map((ps) => ({
      uuid: ps.uuid,
      name: ps.name,
      active: ps.active,
    }));
  }
}
