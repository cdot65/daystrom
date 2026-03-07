/**
 * AIRS integration types — scan results and service interfaces for the
 * Prisma AIRS scanner and topic management APIs.
 */

import type {
  CreateCustomTopicRequest,
  CustomTopic as SdkCustomTopic,
} from '@cdot65/prisma-airs-sdk';

// ---------------------------------------------------------------------------
// SDK re-exports — upstream types used across the AIRS layer
// ---------------------------------------------------------------------------
export type { CreateCustomTopicRequest, SdkCustomTopic };

// ---------------------------------------------------------------------------
// Scan result — normalized output from a single AIRS prompt scan
// ---------------------------------------------------------------------------
export interface ScanResult {
  scanId: string;
  reportId: string;
  action: 'allow' | 'block';
  triggered: boolean;
  category?: string;
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Service interfaces — contracts for scan and topic management adapters
// ---------------------------------------------------------------------------
export interface ScanService {
  scan(profileName: string, prompt: string, sessionId?: string): Promise<ScanResult>;
  scanBatch(
    profileName: string,
    prompts: string[],
    concurrency?: number,
    sessionId?: string,
  ): Promise<ScanResult[]>;
}

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
