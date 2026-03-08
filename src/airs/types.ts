/**
 * AIRS integration types — scan results and service interfaces for the
 * Prisma AIRS scanner, topic management, and red team APIs.
 */

import type {
  CreateCustomTopicRequest,
  CustomTopic as SdkCustomTopic,
} from '@cdot65/prisma-airs-sdk';
import type { ProfileTopic } from '../audit/types.js';

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

// ---------------------------------------------------------------------------
// Red Team types — normalized shapes for red team scan operations
// ---------------------------------------------------------------------------

/** Normalized red team job/scan info. */
export interface RedTeamJob {
  uuid: string;
  name: string;
  status: string;
  jobType: string;
  targetId: string;
  targetName?: string;
  score?: number | null;
  asr?: number | null;
  total?: number | null;
  completed?: number | null;
  createdAt?: string | null;
}

/** Normalized red team target info. */
export interface RedTeamTarget {
  uuid: string;
  name: string;
  status: string;
  targetType?: string;
  active: boolean;
}

/** Normalized attack category with subcategories. */
export interface RedTeamCategory {
  id: string;
  displayName: string;
  description?: string;
  subCategories: Array<{
    id: string;
    displayName: string;
    description?: string;
  }>;
}

/** Normalized static report summary. */
export interface RedTeamStaticReport {
  score?: number | null;
  asr?: number | null;
  severityBreakdown: Array<{
    severity: string;
    successful: number;
    failed: number;
  }>;
  reportSummary?: string | null;
  categories: Array<{
    id: string;
    displayName: string;
    asr: number;
    successful: number;
    failed: number;
    total: number;
  }>;
}

/** Normalized custom attack report summary. */
export interface RedTeamCustomReport {
  totalPrompts: number;
  totalAttacks: number;
  totalThreats: number;
  failedAttacks: number;
  score: number;
  asr: number;
  promptSets: Array<{
    promptSetId: string;
    promptSetName: string;
    totalPrompts: number;
    totalAttacks: number;
    totalThreats: number;
    threatRate: number;
  }>;
}

/** Normalized attack list item (static/dynamic scans). */
export interface RedTeamAttack {
  id: string;
  name: string;
  severity?: string;
  category?: string;
  subCategory?: string;
  successful: boolean;
}

/** Normalized custom attack item (custom prompt set scans). */
export interface RedTeamCustomAttack {
  promptId: string;
  promptText: string;
  goal?: string;
  threat: boolean;
  asr?: number;
  promptSetName?: string;
}

/** Contract for AI Red Team scan operations. */
export interface RedTeamService {
  /** List configured red team targets. */
  listTargets(): Promise<RedTeamTarget[]>;

  /** Create a red team scan job. */
  createScan(request: {
    name: string;
    targetUuid: string;
    jobType: string;
    categories?: Record<string, unknown>;
    customPromptSets?: string[];
  }): Promise<RedTeamJob>;

  /** Get scan status by job ID. */
  getScan(jobId: string): Promise<RedTeamJob>;

  /** List recent scans with optional filters. */
  listScans(opts?: {
    status?: string;
    jobType?: string;
    targetId?: string;
    limit?: number;
  }): Promise<RedTeamJob[]>;

  /** Abort a running scan. */
  abortScan(jobId: string): Promise<void>;

  /** Get static scan report. */
  getStaticReport(jobId: string): Promise<RedTeamStaticReport>;

  /** Get custom attack report. */
  getCustomReport(jobId: string): Promise<RedTeamCustomReport>;

  /** List attacks from a static/dynamic scan. */
  listAttacks(
    jobId: string,
    opts?: { severity?: string; limit?: number },
  ): Promise<RedTeamAttack[]>;

  /** List attacks from a custom prompt set scan. */
  listCustomAttacks(jobId: string, opts?: { limit?: number }): Promise<RedTeamCustomAttack[]>;

  /** List available attack categories. */
  getCategories(): Promise<RedTeamCategory[]>;

  /** Poll until scan completes. Calls onProgress for status updates. */
  waitForCompletion(
    jobId: string,
    onProgress?: (job: RedTeamJob) => void,
    intervalMs?: number,
  ): Promise<RedTeamJob>;
}

// ---------------------------------------------------------------------------
// Management service interface
// ---------------------------------------------------------------------------

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
  /** List all topics configured in a profile with full details. */
  getProfileTopics(profileName: string): Promise<ProfileTopic[]>;
}
