import { RedTeamClient, type RedTeamClientOptions } from '@cdot65/prisma-airs-sdk';
import type {
  RedTeamAttack,
  RedTeamCategory,
  RedTeamCustomReport,
  RedTeamJob,
  RedTeamService,
  RedTeamStaticReport,
  RedTeamTarget,
} from './types.js';

const TERMINAL_STATUSES = new Set(['COMPLETED', 'PARTIALLY_COMPLETE', 'FAILED', 'ABORTED']);

/** Normalize an SDK job response into a RedTeamJob. */
function normalizeJob(raw: Record<string, unknown>): RedTeamJob {
  const target = raw.target as Record<string, unknown> | undefined;
  return {
    uuid: raw.uuid as string,
    name: raw.name as string,
    status: raw.status as string,
    jobType: raw.job_type as string,
    targetId: raw.target_id as string,
    targetName: target?.name as string | undefined,
    score: raw.score as number | null | undefined,
    asr: raw.asr as number | null | undefined,
    total: raw.total as number | null | undefined,
    completed: raw.completed as number | null | undefined,
    createdAt: raw.created_at as string | null | undefined,
  };
}

/**
 * Wraps the SDK's RedTeamClient to implement RedTeamService.
 * Provides scan creation, status polling, report retrieval, and target/category listing.
 */
export class SdkRedTeamService implements RedTeamService {
  private client: RedTeamClient;

  constructor(opts?: RedTeamClientOptions) {
    this.client = new RedTeamClient(opts);
  }

  async listTargets(): Promise<RedTeamTarget[]> {
    const response = await this.client.targets.list();
    return ((response as Record<string, unknown>).data as Record<string, unknown>[]).map((t) => ({
      uuid: t.uuid as string,
      name: t.name as string,
      status: t.status as string,
      targetType: t.target_type as string | undefined,
      active: t.active as boolean,
    }));
  }

  async createScan(request: {
    name: string;
    targetUuid: string;
    jobType: string;
    categories?: Record<string, unknown>;
    customPromptSets?: string[];
  }): Promise<RedTeamJob> {
    let jobMetadata: Record<string, unknown> = {};
    if (request.jobType === 'STATIC' && request.categories) {
      jobMetadata = { categories: request.categories };
    } else if (request.jobType === 'CUSTOM' && request.customPromptSets) {
      jobMetadata = {
        custom_prompt_sets: request.customPromptSets.map((uuid) => ({ uuid })),
      };
    }

    const response = await this.client.scans.create({
      name: request.name,
      target: { uuid: request.targetUuid },
      job_type: request.jobType,
      job_metadata: jobMetadata,
    });
    return normalizeJob(response as unknown as Record<string, unknown>);
  }

  async getScan(jobId: string): Promise<RedTeamJob> {
    const response = await this.client.scans.get(jobId);
    return normalizeJob(response as unknown as Record<string, unknown>);
  }

  async listScans(opts?: {
    status?: string;
    jobType?: string;
    targetId?: string;
    limit?: number;
  }): Promise<RedTeamJob[]> {
    const sdkOpts: Record<string, unknown> = {};
    if (opts?.status) sdkOpts.status = opts.status;
    if (opts?.jobType) sdkOpts.job_type = opts.jobType;
    if (opts?.targetId) sdkOpts.target_id = opts.targetId;
    if (opts?.limit) sdkOpts.limit = opts.limit;

    const response = await this.client.scans.list(sdkOpts);
    return ((response as Record<string, unknown>).data as Record<string, unknown>[]).map(
      normalizeJob,
    );
  }

  async abortScan(jobId: string): Promise<void> {
    await this.client.scans.abort(jobId);
  }

  async getStaticReport(jobId: string): Promise<RedTeamStaticReport> {
    const raw = (await this.client.reports.getStaticReport(jobId)) as Record<string, unknown>;
    const severityReport = raw.severity_report as Record<string, unknown>;
    const stats = (severityReport?.stats ?? []) as Array<Record<string, unknown>>;

    const securityReport = raw.security_report as Record<string, unknown> | undefined;
    const subCategories = (securityReport?.sub_categories ?? []) as Array<Record<string, unknown>>;

    return {
      score: raw.score as number | null | undefined,
      asr: raw.asr as number | null | undefined,
      severityBreakdown: stats.map((s) => ({
        severity: s.severity as string,
        successful: (s.successful ?? 0) as number,
        failed: (s.failed ?? 0) as number,
      })),
      reportSummary: raw.report_summary as string | null | undefined,
      categories: subCategories.map((sc) => {
        const successful = (sc.successful ?? 0) as number;
        const failed = (sc.failed ?? 0) as number;
        const total = (sc.total ?? successful + failed) as number;
        return {
          id: sc.id as string,
          displayName: sc.display_name as string,
          asr: total > 0 ? successful / total : 0,
          successful,
          failed,
          total,
        };
      }),
    };
  }

  async getCustomReport(jobId: string): Promise<RedTeamCustomReport> {
    const raw = (await this.client.customAttackReports.getReport(jobId)) as Record<string, unknown>;
    const reports = (raw.custom_attack_reports ?? []) as Array<Record<string, unknown>>;

    return {
      totalPrompts: raw.total_prompts as number,
      totalAttacks: raw.total_attacks as number,
      totalThreats: raw.total_threats as number,
      failedAttacks: raw.failed_attacks as number,
      score: raw.score as number,
      asr: raw.asr as number,
      promptSets: reports.map((r) => ({
        promptSetId: r.prompt_set_id as string,
        promptSetName: r.prompt_set_name as string,
        totalPrompts: r.total_prompts as number,
        totalAttacks: r.total_attacks as number,
        totalThreats: r.total_threats as number,
        threatRate: r.threat_rate as number,
      })),
    };
  }

  async listAttacks(
    jobId: string,
    opts?: { severity?: string; limit?: number },
  ): Promise<RedTeamAttack[]> {
    const response = await this.client.reports.listAttacks(jobId, opts);
    return ((response as Record<string, unknown>).data as Array<Record<string, unknown>>).map(
      (a) => ({
        id: a.uuid as string,
        name: a.attack_name as string,
        severity: a.severity as string | undefined,
        category: a.category as string | undefined,
        subCategory: a.sub_category as string | undefined,
        successful: a.successful as boolean,
      }),
    );
  }

  async getCategories(): Promise<RedTeamCategory[]> {
    const response = (await this.client.scans.getCategories()) as Array<Record<string, unknown>>;
    return response.map((c) => ({
      id: c.id as string,
      displayName: c.display_name as string,
      description: c.description as string | undefined,
      subCategories: ((c.sub_categories ?? []) as Array<Record<string, unknown>>).map((sc) => ({
        id: sc.id as string,
        displayName: sc.display_name as string,
        description: sc.description as string | undefined,
      })),
    }));
  }

  async waitForCompletion(
    jobId: string,
    onProgress?: (job: RedTeamJob) => void,
    intervalMs = 5000,
  ): Promise<RedTeamJob> {
    const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const job = await this.getScan(jobId);
      onProgress?.(job);

      if (job.status === 'FAILED') {
        throw new Error(`Scan ${jobId} failed`);
      }
      if (TERMINAL_STATUSES.has(job.status)) {
        return job;
      }
      await delay(intervalMs);
    }
  }
}
