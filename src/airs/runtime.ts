import { Content, init, Scanner } from '@cdot65/prisma-airs-sdk';
import type { RuntimeScanResult, RuntimeService } from './types.js';

const BATCH_SIZE = 5;
const DEFAULT_POLL_INTERVAL_MS = 5000;

export class SdkRuntimeService implements RuntimeService {
  private scanner: InstanceType<typeof Scanner>;

  constructor(apiKey: string) {
    init({ apiKey });
    this.scanner = new Scanner();
  }

  async scanPrompt(
    profileName: string,
    prompt: string,
    response?: string,
  ): Promise<RuntimeScanResult> {
    const contentOpts: Record<string, string> = { prompt };
    if (response) contentOpts.response = response;
    const content = new Content(contentOpts);

    const res = await this.scanner.syncScan({ profile_name: profileName }, content, undefined);

    const detected = (res.prompt_detected as Record<string, boolean> | undefined) ?? {};
    const triggered = !!(
      detected.topic_violation ||
      detected.injection ||
      detected.toxic_content ||
      detected.dlp ||
      detected.url_cats ||
      detected.malicious_code
    );

    return {
      prompt,
      response,
      scanId: res.scan_id ?? '',
      reportId: res.report_id ?? '',
      action: res.action === 'block' ? 'block' : 'allow',
      category: (res.category as string) ?? 'unknown',
      triggered,
      detections: detected,
    };
  }

  async submitBulkScan(profileName: string, prompts: string[]): Promise<string[]> {
    const scanIds: string[] = [];

    for (let i = 0; i < prompts.length; i += BATCH_SIZE) {
      const batch = prompts.slice(i, i + BATCH_SIZE);
      const scanObjects = batch.map((prompt, idx) => ({
        req_id: i + idx,
        scan_req: {
          ai_profile: { profile_name: profileName },
          contents: [{ prompt }],
        },
      }));

      const res = await this.scanner.asyncScan(scanObjects);
      scanIds.push(res.scan_id);
    }

    return scanIds;
  }

  /**
   * Poll async scan results until all complete or fail.
   *
   * Note: The async query API (`queryByScanIds`) does not return `prompt`,
   * `response`, `triggered`, or `detections` fields. These are set to
   * defaults (`''`, `undefined`, `false`, `{}`) in the returned results.
   * Use `scanPrompt()` (sync API) when these fields are needed.
   */
  async pollResults(
    scanIds: string[],
    intervalMs = DEFAULT_POLL_INTERVAL_MS,
  ): Promise<RuntimeScanResult[]> {
    const completed = new Map<string, RuntimeScanResult>();
    const pending = new Set(scanIds);

    while (pending.size > 0) {
      const batch = [...pending].slice(0, 5);
      const results = await this.scanner.queryByScanIds(batch);

      for (const r of results) {
        const id = r.scan_id ?? '';
        const status = r.status ?? '';

        if (status === 'COMPLETED' && r.result) {
          const result = r.result as Record<string, unknown>;
          completed.set(id, {
            prompt: '', // not available from async API
            response: undefined, // not available from async API
            scanId: (result.scan_id as string) ?? id,
            reportId: (result.report_id as string) ?? '',
            action: result.action === 'block' ? 'block' : 'allow',
            category: (result.category as string) ?? 'unknown',
            triggered: false, // not available from async API — always false
            detections: {}, // not available from async API
          });
          pending.delete(id);
        } else if (status === 'FAILED') {
          completed.set(id, {
            prompt: '', // not available from async API
            response: undefined, // not available from async API
            scanId: id,
            reportId: '',
            action: 'allow', // safe default for failed scans
            category: 'error',
            triggered: false, // not available from async API — always false
            detections: {}, // not available from async API
          });
          pending.delete(id);
        }
      }

      if (pending.size > 0) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    return scanIds.map((id) => completed.get(id) as RuntimeScanResult);
  }

  static formatResultsCsv(results: RuntimeScanResult[]): string {
    const header = 'prompt,action,category,triggered,scan_id,report_id';
    const rows = results.map((r) => {
      const escaped = r.prompt.replace(/"/g, '""');
      return `"${escaped}","${r.action}","${r.category}","${r.triggered}","${r.scanId}","${r.reportId}"`;
    });
    return [header, ...rows].join('\n');
  }
}
