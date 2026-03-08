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
/** Normalized output from a single AIRS prompt scan. */
export interface ScanResult {
  scanId: string;
  reportId: string;
  action: 'allow' | 'block';
  /** Whether the topic guardrail was triggered for this prompt. */
  triggered: boolean;
  category?: string;
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Service interfaces — contracts for scan and topic management adapters
// ---------------------------------------------------------------------------

/** Contract for AIRS prompt scanning operations. */
export interface ScanService {
  /** Scan a single prompt against a security profile. */
  scan(profileName: string, prompt: string, sessionId?: string): Promise<ScanResult>;
  /** Scan multiple prompts with concurrency control. */
  scanBatch(
    profileName: string,
    prompts: string[],
    concurrency?: number,
    sessionId?: string,
  ): Promise<ScanResult[]>;
}

/** Contract for custom prompt set operations in AI Red Team. */
export interface PromptSetService {
  /** Create a new custom prompt set. */
  createPromptSet(name: string, description?: string): Promise<{ uuid: string; name: string }>;
  /** Add a prompt to an existing prompt set. */
  addPrompt(
    promptSetId: string,
    prompt: string,
    goal?: string,
  ): Promise<{ uuid: string; prompt: string }>;
  /** List all custom prompt sets. */
  listPromptSets(): Promise<Array<{ uuid: string; name: string; active: boolean }>>;
}

/** Contract for AIRS topic CRUD and profile linking operations. */
export interface ManagementService {
  /** Create a new custom topic. */
  createTopic(request: CreateCustomTopicRequest): Promise<SdkCustomTopic>;
  /** Update an existing custom topic by ID. */
  updateTopic(topicId: string, request: CreateCustomTopicRequest): Promise<SdkCustomTopic>;
  /** Delete a custom topic by ID. */
  deleteTopic(topicId: string): Promise<void>;
  /** List all custom topics. */
  listTopics(): Promise<SdkCustomTopic[]>;
  /** Assign a topic to a security profile's topic-guardrails. */
  assignTopicToProfile(
    profileName: string,
    topicId: string,
    topicName: string,
    action: 'allow' | 'block',
  ): Promise<void>;
}
