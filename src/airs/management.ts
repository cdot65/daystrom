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
   * Links a custom topic to a profile's topic-guardrails config.
   * Reads the current profile policy, merges the topic into the
   * model-protection → topic-guardrails → topic-list, then updates.
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
    const modelProtection: any[] = modelConfig['model-protection'] ?? [];
    let topicGuardrails = modelProtection.find((mp: any) => mp.name === 'topic-guardrails');

    if (!topicGuardrails) {
      topicGuardrails = {
        action: 'allow',
        name: 'topic-guardrails',
        options: [],
        'topic-list': [
          { action: 'allow', topic: [] },
          { action: 'block', topic: [] },
        ],
      };
      modelProtection.push(topicGuardrails);
    }

    // Ensure topic-list has entries for both actions
    const topicList: any[] = topicGuardrails['topic-list'] ?? [];
    let actionEntry = topicList.find((tl: any) => tl.action === action);
    if (!actionEntry) {
      actionEntry = { action, topic: [] };
      topicList.push(actionEntry);
    }

    // Check if topic already linked
    const existing = actionEntry.topic.find((t: any) => t.topic_id === topicId);
    if (existing) return; // already assigned

    // Add the topic
    actionEntry.topic.push({
      topic_id: topicId,
      topic_name: topicName,
      revision: 1,
    });

    // Write back
    topicGuardrails['topic-list'] = topicList;
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
