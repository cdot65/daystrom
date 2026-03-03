import { Content, init, Scanner } from '@cdot65/prisma-airs-sdk';
import pLimit from 'p-limit';
import type { ScanResult, ScanService } from './types.js';

export class AirsScanService implements ScanService {
  private scanner: InstanceType<typeof Scanner>;

  constructor(apiKey: string) {
    init({ apiKey });
    this.scanner = new Scanner();
  }

  async scan(profileName: string, prompt: string, sessionId?: string): Promise<ScanResult> {
    const content = new Content({ prompt });
    const response = await this.scanner.syncScan(
      { profile_name: profileName },
      content,
      sessionId ? { sessionId } : undefined,
    );

    const action = response.action === 'block' ? 'block' : 'allow';
    const detected = response.prompt_detected as Record<string, unknown> | undefined;
    const triggered = !!(detected?.topic_guardrails_details || detected?.topic_violation);

    return {
      scanId: response.scan_id ?? '',
      reportId: response.report_id ?? '',
      action: action as 'allow' | 'block',
      triggered,
      raw: response,
    };
  }

  async scanBatch(
    profileName: string,
    prompts: string[],
    concurrency = 5,
    sessionId?: string,
  ): Promise<ScanResult[]> {
    const limit = pLimit(concurrency);
    return Promise.all(
      prompts.map((prompt) => limit(() => this.scan(profileName, prompt, sessionId))),
    );
  }
}
