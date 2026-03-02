import type {
  CustomTopic as SdkCustomTopic,
  CreateCustomTopicRequest,
} from '@cdot65/prisma-airs-sdk';

export type { CreateCustomTopicRequest, SdkCustomTopic };

export interface ScanResult {
  scanId: string;
  reportId: string;
  action: 'allow' | 'block';
  triggered: boolean;
  category?: string;
  raw?: unknown;
}

export interface ScanService {
  scan(profileName: string, prompt: string): Promise<ScanResult>;
  scanBatch(profileName: string, prompts: string[], concurrency?: number): Promise<ScanResult[]>;
}

/**
 * Thin interface over the SDK ManagementClient for topic CRUD.
 * Aligns with SDK v2 TopicsClient method signatures.
 */
export interface ManagementService {
  createTopic(request: CreateCustomTopicRequest): Promise<SdkCustomTopic>;
  updateTopic(topicId: string, request: CreateCustomTopicRequest): Promise<SdkCustomTopic>;
  deleteTopic(topicId: string): Promise<void>;
  listTopics(): Promise<SdkCustomTopic[]>;
  assignTopicToProfile(
    profileName: string,
    topicId: string,
    topicName: string,
    action: 'allow' | 'block',
  ): Promise<void>;
}
