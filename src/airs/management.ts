import {
  ManagementClient,
  type ManagementClientOptions,
  type CreateCustomTopicRequest,
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
}
