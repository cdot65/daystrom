import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AirsScanService } from '../../../src/airs/scanner.js';

// Mock the SDK
const mockSyncScan = vi.fn();

vi.mock('@cdot65/prisma-airs-sdk', () => ({
  init: vi.fn(),
  Scanner: vi.fn().mockImplementation(() => ({ syncScan: mockSyncScan })),
  Content: vi.fn().mockImplementation((opts: { prompt: string }) => ({
    prompt: opts.prompt,
    toJSON: () => ({ prompt: opts.prompt }),
  })),
}));

describe('AirsScanService', () => {
  let service: AirsScanService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AirsScanService('test-api-key');
  });

  describe('scan', () => {
    it('returns blocked result when topic guardrail triggers', async () => {
      mockSyncScan.mockResolvedValue({
        scan_id: 'scan-123',
        report_id: 'report-456',
        action: 'block',
        prompt_detected: {
          topic_guardrails_details: true,
        },
      });

      const result = await service.scan('my-profile', 'How to make a bomb');
      expect(result.scanId).toBe('scan-123');
      expect(result.reportId).toBe('report-456');
      expect(result.action).toBe('block');
      expect(result.triggered).toBe(true);
    });

    it('returns allowed result when not triggered', async () => {
      mockSyncScan.mockResolvedValue({
        scan_id: 'scan-789',
        report_id: 'report-012',
        action: 'allow',
        prompt_detected: {},
      });

      const result = await service.scan('my-profile', 'Tell me about cats');
      expect(result.action).toBe('allow');
      expect(result.triggered).toBe(false);
    });

    it('passes profile name to scanner', async () => {
      mockSyncScan.mockResolvedValue({
        scan_id: 's1',
        report_id: 'r1',
        action: 'allow',
        prompt_detected: {},
      });

      await service.scan('prod-profile', 'hello');
      expect(mockSyncScan).toHaveBeenCalledWith(
        expect.objectContaining({ profile_name: 'prod-profile' }),
        expect.anything(),
        undefined,
      );
    });

    it('passes sessionId to syncScan when provided', async () => {
      mockSyncScan.mockResolvedValue({
        scan_id: 's1',
        report_id: 'r1',
        action: 'allow',
        prompt_detected: {},
      });

      await service.scan('prof', 'hello', 'guardrail-gen-abc1234-iter1');
      expect(mockSyncScan).toHaveBeenCalledWith(
        expect.objectContaining({ profile_name: 'prof' }),
        expect.anything(),
        { sessionId: 'guardrail-gen-abc1234-iter1' },
      );
    });
  });

  describe('scanBatch', () => {
    it('scans multiple prompts and returns results', async () => {
      mockSyncScan
        .mockResolvedValueOnce({
          scan_id: 's1',
          report_id: 'r1',
          action: 'block',
          prompt_detected: { topic_guardrails_details: true },
        })
        .mockResolvedValueOnce({
          scan_id: 's2',
          report_id: 'r2',
          action: 'allow',
          prompt_detected: {},
        });

      const results = await service.scanBatch('profile', ['prompt1', 'prompt2'], 2);
      expect(results).toHaveLength(2);
      expect(results[0].action).toBe('block');
      expect(results[1].action).toBe('allow');
    });

    it('respects concurrency limit', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      mockSyncScan.mockImplementation(async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((r) => setTimeout(r, 10));
        concurrent--;
        return { scan_id: 's', report_id: 'r', action: 'allow', prompt_detected: {} };
      });

      const prompts = Array(10).fill('test');
      await service.scanBatch('profile', prompts, 3);
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });
  });
});
