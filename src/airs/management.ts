import {
  type CreateCustomTopicRequest,
  ManagementClient,
  type ManagementClientOptions,
  type CustomTopic as SdkCustomTopic,
} from '@cdot65/prisma-airs-sdk';
import type { ManagementService } from './types.js';

/**
 * Wraps the SDK's ManagementClient to implement our ManagementService interface.
 * OAuth2 token management, caching, and retry are handled by the SDK.
 */
export class SdkManagementService implements ManagementService {
  private client: ManagementClient;

  constructor(opts?: ManagementClientOptions) {
    this.client = new ManagementClient(opts);
  }

  async createTopic(request: CreateCustomTopicRequest): Promise<SdkCustomTopic> {
    return this.client.topics.create(request);
  }

  async updateTopic(topicId: string, request: CreateCustomTopicRequest): Promise<SdkCustomTopic> {
    return this.client.topics.update(topicId, request);
  }

  async deleteTopic(topicId: string): Promise<void> {
    await this.client.topics.delete(topicId);
  }

  async listTopics(): Promise<SdkCustomTopic[]> {
    const response = await this.client.topics.list();
    return response.custom_topics;
  }

  /**
   * Sets a single custom topic on a profile's topic-guardrails config.
   * Replaces any existing topics so only the current topic is evaluated.
   * Previous runs may have left stale topics — this clears them.
   */
  async assignTopicToProfile(
    profileName: string,
    topicId: string,
    topicName: string,
    action: 'allow' | 'block',
  ): Promise<void> {
    // Find profile by name
    const { ai_profiles } = await this.client.profiles.list();
    const profile = ai_profiles.find((p) => p.profile_name === profileName);
    if (!profile?.profile_id) {
      throw new Error(`Profile "${profileName}" not found`);
    }

    // Deep clone the policy to mutate
    const policy = JSON.parse(JSON.stringify(profile.policy ?? {}));
    const aiProfiles = policy['ai-security-profiles'] ?? [
      { 'model-type': 'default', 'model-configuration': {} },
    ];
    const modelConfig = aiProfiles[0]?.['model-configuration'] ?? {};

    // Find or create model-protection with topic-guardrails
    const modelProtection: Record<string, unknown>[] = modelConfig['model-protection'] ?? [];
    let topicGuardrails = modelProtection.find((mp) => mp.name === 'topic-guardrails');

    if (!topicGuardrails) {
      topicGuardrails = {
        action: 'block',
        name: 'topic-guardrails',
        options: [],
        'topic-list': [],
      };
      modelProtection.push(topicGuardrails);
    }

    // Ensure the guardrail-level action is always 'block' so violations are enforced.
    // The allow/block distinction is controlled by which topic-list entry the topic is in.
    topicGuardrails.action = 'block';

    // Replace the entire topic-list with only the current topic under the given action.
    // The opposite action gets an empty list to ensure no stale topics remain.
    const oppositeAction = action === 'block' ? 'allow' : 'block';
    topicGuardrails['topic-list'] = [
      {
        action,
        topic: [{ topic_id: topicId, topic_name: topicName, revision: 1 }],
      },
      {
        action: oppositeAction,
        topic: [],
      },
    ];

    // Write back
    modelConfig['model-protection'] = modelProtection;
    aiProfiles[0]['model-configuration'] = modelConfig;
    policy['ai-security-profiles'] = aiProfiles;

    await this.client.profiles.update(profile.profile_id, {
      profile_name: profile.profile_name,
      active: profile.active,
      policy,
    });
  }
}
