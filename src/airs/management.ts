import {
  type CreateCustomTopicRequest,
  ManagementClient,
  type ManagementClientOptions,
  type CustomTopic as SdkCustomTopic,
} from '@cdot65/prisma-airs-sdk';
import type { ProfileTopic } from '../audit/types.js';
import type {
  DeleteResponse,
  ManagementService,
  PaginationOptions,
  SecurityProfileInfo,
  SecurityProfileListResult,
} from './types.js';

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

  async forceDeleteTopic(topicId: string, updatedBy?: string): Promise<DeleteResponse> {
    const response = await this.client.topics.forceDelete(topicId, updatedBy);
    return { message: (response as unknown as Record<string, string>).message };
  }

  async listTopics(): Promise<SdkCustomTopic[]> {
    const response = await this.client.topics.list();
    return response.custom_topics;
  }

  /**
   * Sets a single custom topic on a profile's topic-guardrails config.
   * Delegates to {@link assignTopicsToProfile} for backward compatibility.
   */
  async assignTopicToProfile(
    profileName: string,
    topicId: string,
    topicName: string,
    action: 'allow' | 'block',
  ): Promise<void> {
    return this.assignTopicsToProfile(profileName, [{ topicId, topicName, action }]);
  }

  /**
   * Sets one or more custom topics on a profile's topic-guardrails config.
   * Replaces any existing topics — previous runs' stale topics are cleared.
   * Groups topics by action; skips empty action groups (AIRS rejects them).
   *
   * CRITICAL: Each topic entry MUST include the current `revision` number.
   * AIRS pins topic content to the revision specified in the profile — omitting
   * it defaults to revision 0 (original content), not the latest.
   */
  async assignTopicsToProfile(
    profileName: string,
    topics: Array<{ topicId: string; topicName: string; action: 'allow' | 'block' }>,
    guardrailAction?: 'allow' | 'block',
  ): Promise<void> {
    // Find profile by name
    const { ai_profiles } = await this.client.profiles.list();
    const profile = ai_profiles.find((p) => p.profile_name === profileName);
    if (!profile?.profile_id) {
      throw new Error(`Profile "${profileName}" not found`);
    }

    // Fetch current topic revisions — AIRS requires the revision field to
    // reference the correct topic content snapshot.
    const allTopics = await this.listTopics();
    const revisionMap = new Map(allTopics.map((t) => [t.topic_id, t.revision ?? 0]));

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

    // Guardrail-level action controls default behavior for topic-guardrails layer.
    // 'block' = block all unless explicitly allowed (requires allow topics).
    // 'allow' = allow all unless explicitly blocked (only block topics needed).
    topicGuardrails.action = guardrailAction ?? 'block';

    // Group topics by action, build topic-list entries with revision (skip empty groups).
    const byAction = new Map<
      string,
      Array<{ topic_id: string; topic_name: string; revision: number }>
    >();
    for (const t of topics) {
      const group = byAction.get(t.action) ?? [];
      group.push({
        topic_id: t.topicId,
        topic_name: t.topicName,
        revision: revisionMap.get(t.topicId) ?? 0,
      });
      byAction.set(t.action, group);
    }

    const topicList: Array<{
      action: string;
      topic: Array<{ topic_id: string; topic_name: string; revision: number }>;
    }> = [];
    for (const [action, group] of byAction) {
      topicList.push({ action, topic: group });
    }

    topicGuardrails['topic-list'] = topicList;

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

  async getProfileTopics(profileName: string): Promise<ProfileTopic[]> {
    const { ai_profiles } = await this.client.profiles.list();
    const profile = ai_profiles.find((p) => p.profile_name === profileName);
    if (!profile?.profile_id) {
      throw new Error(`Profile "${profileName}" not found`);
    }

    // Extract topic entries from profile policy
    const policy = profile.policy ?? {};
    const aiProfiles = (policy as Record<string, unknown[]>)['ai-security-profiles'] ?? [];
    const modelConfig =
      (aiProfiles[0] as Record<string, Record<string, unknown>> | undefined)?.[
        'model-configuration'
      ] ?? {};
    const modelProtection = (modelConfig['model-protection'] as Record<string, unknown>[]) ?? [];
    const topicGuardrails = modelProtection.find((mp) => mp.name === 'topic-guardrails');

    if (!topicGuardrails) return [];

    const topicList =
      (topicGuardrails['topic-list'] as Array<{
        action: string;
        topic: Array<{ topic_id: string; topic_name: string }>;
      }>) ?? [];

    // Flatten entries into topic refs with action
    const topicRefs: Array<{ topicId: string; topicName: string; action: 'allow' | 'block' }> = [];
    for (const entry of topicList) {
      for (const t of entry.topic ?? []) {
        topicRefs.push({
          topicId: t.topic_id,
          topicName: t.topic_name,
          action: entry.action as 'allow' | 'block',
        });
      }
    }

    if (topicRefs.length === 0) return [];

    // Fetch full topic details
    const allTopics = await this.listTopics();
    const topicMap = new Map(allTopics.map((t) => [t.topic_id, t]));

    return topicRefs.map((ref) => {
      const full = topicMap.get(ref.topicId);
      return {
        topicId: ref.topicId,
        topicName: ref.topicName,
        action: ref.action,
        description: full?.description ?? '',
        examples: full?.examples ?? [],
      };
    });
  }

  // -------------------------------------------------------------------------
  // Profile CRUD
  // -------------------------------------------------------------------------

  private normalizeProfile(p: Record<string, unknown>): SecurityProfileInfo {
    return {
      profileId: p.profile_id as string,
      profileName: p.profile_name as string,
      revision: p.revision as number | undefined,
      active: p.active as boolean | undefined,
      createdBy: p.created_by as string | undefined,
      updatedBy: p.updated_by as string | undefined,
      lastModifiedTs: p.last_modified_ts as string | undefined,
      policy: p.policy as Record<string, unknown> | undefined,
    };
  }

  async listProfiles(opts?: PaginationOptions): Promise<SecurityProfileListResult> {
    const response = await this.client.profiles.list(opts);
    return {
      profiles: (response.ai_profiles ?? []).map((p: Record<string, unknown>) =>
        this.normalizeProfile(p),
      ),
      nextOffset: response.next_offset,
    };
  }

  async createProfile(request: Record<string, unknown>): Promise<SecurityProfileInfo> {
    const response = await this.client.profiles.create(request as never);
    return this.normalizeProfile(response as unknown as Record<string, unknown>);
  }

  async updateProfile(
    profileId: string,
    request: Record<string, unknown>,
  ): Promise<SecurityProfileInfo> {
    const response = await this.client.profiles.update(profileId, request as never);
    return this.normalizeProfile(response as unknown as Record<string, unknown>);
  }

  async deleteProfile(profileId: string): Promise<DeleteResponse> {
    const response = await this.client.profiles.delete(profileId);
    return { message: (response as unknown as Record<string, string>).message };
  }

  async forceDeleteProfile(profileId: string, updatedBy: string): Promise<DeleteResponse> {
    const response = await this.client.profiles.forceDelete(profileId, updatedBy);
    return { message: (response as unknown as Record<string, string>).message };
  }
}
