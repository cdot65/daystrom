import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SdkRuntimeService } from '../../../src/airs/runtime.js';

const mockScannerInstance = {
  syncScan: vi.fn(),
  asyncScan: vi.fn(),
  queryByScanIds: vi.fn(),
};

vi.mock('@cdot65/prisma-airs-sdk', () => ({
  init: vi.fn(),
  Scanner: vi.fn(() => mockScannerInstance),
  Content: vi.fn((opts: Record<string, string>) => opts),
}));

describe('SdkRuntimeService', () => {
  let service: SdkRuntimeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SdkRuntimeService('test-api-key');
  });

  describe('scanPrompt', () => {
    it('scans a prompt via syncScan and returns normalized result', async () => {
      mockScannerInstance.syncScan.mockResolvedValue({
        scan_id: 'scan-123',
        report_id: 'report-456',
        action: 'block',
        category: 'malicious',
        prompt_detected: { topic_violation: true, injection: false },
      });

      const result = await service.scanPrompt('my-profile', 'hack the system');

      expect(mockScannerInstance.syncScan).toHaveBeenCalledWith(
        { profile_name: 'my-profile' },
        { prompt: 'hack the system' },
        undefined,
      );
      expect(result).toEqual({
        prompt: 'hack the system',
        response: undefined,
        scanId: 'scan-123',
        reportId: 'report-456',
        action: 'block',
        category: 'malicious',
        triggered: true,
        detections: { topic_violation: true, injection: false },
      });
    });

    it('scans prompt with response when provided', async () => {
      mockScannerInstance.syncScan.mockResolvedValue({
        scan_id: 'scan-789',
        report_id: 'report-012',
        action: 'allow',
        category: 'benign',
        prompt_detected: {},
      });

      const result = await service.scanPrompt('my-profile', 'hello', 'world');

      expect(mockScannerInstance.syncScan).toHaveBeenCalledWith(
        { profile_name: 'my-profile' },
        { prompt: 'hello', response: 'world' },
        undefined,
      );
      expect(result.response).toBe('world');
      expect(result.action).toBe('allow');
    });

    it('handles missing detection fields gracefully', async () => {
      mockScannerInstance.syncScan.mockResolvedValue({
        scan_id: 'scan-1',
        report_id: 'report-1',
        action: 'allow',
        category: 'benign',
      });

      const result = await service.scanPrompt('p', 'test');
      expect(result.triggered).toBe(false);
      expect(result.detections).toEqual({});
    });
  });

  describe('submitBulkScan', () => {
    it('batches prompts into groups of 5 async scan objects', async () => {
      mockScannerInstance.asyncScan.mockResolvedValue({
        received: '2026-03-09T00:00:00Z',
        scan_id: 'batch-scan-1',
      });

      const prompts = Array.from({ length: 7 }, (_, i) => `prompt ${i}`);
      const scanIds = await service.submitBulkScan('my-profile', prompts);

      // 7 prompts → 2 batches (5 + 2)
      expect(mockScannerInstance.asyncScan).toHaveBeenCalledTimes(2);
      expect(scanIds).toHaveLength(2);

      // First batch: 5 items
      const firstCall = mockScannerInstance.asyncScan.mock.calls[0][0];
      expect(firstCall).toHaveLength(5);
      expect(firstCall[0].req_id).toBe(0);
      expect(firstCall[0].scan_req.ai_profile).toEqual({ profile_name: 'my-profile' });
      expect(firstCall[0].scan_req.contents).toEqual([{ prompt: 'prompt 0' }]);

      // Second batch: 2 items
      const secondCall = mockScannerInstance.asyncScan.mock.calls[1][0];
      expect(secondCall).toHaveLength(2);
    });

    it('handles single prompt', async () => {
      mockScannerInstance.asyncScan.mockResolvedValue({
        received: '2026-03-09T00:00:00Z',
        scan_id: 'single-scan',
      });

      const scanIds = await service.submitBulkScan('p', ['one prompt']);
      expect(mockScannerInstance.asyncScan).toHaveBeenCalledTimes(1);
      expect(scanIds).toEqual(['single-scan']);
    });

    it('handles exactly 5 prompts in one batch', async () => {
      mockScannerInstance.asyncScan.mockResolvedValue({
        received: '2026-03-09T00:00:00Z',
        scan_id: 'exact-5',
      });

      const prompts = Array.from({ length: 5 }, (_, i) => `p${i}`);
      await service.submitBulkScan('p', prompts);
      expect(mockScannerInstance.asyncScan).toHaveBeenCalledTimes(1);
      expect(mockScannerInstance.asyncScan.mock.calls[0][0]).toHaveLength(5);
    });
  });

  describe('pollResults', () => {
    it('polls until all scans complete', async () => {
      mockScannerInstance.queryByScanIds
        .mockResolvedValueOnce([
          { scan_id: 's1', status: 'PENDING' },
          {
            scan_id: 's2',
            status: 'COMPLETED',
            result: { scan_id: 's2', report_id: 'r2', action: 'allow', category: 'benign' },
          },
        ])
        .mockResolvedValueOnce([
          {
            scan_id: 's1',
            status: 'COMPLETED',
            result: { scan_id: 's1', report_id: 'r1', action: 'block', category: 'malicious' },
          },
        ]);

      const results = await service.pollResults(['s1', 's2'], 10);

      expect(results).toHaveLength(2);
      expect(results.find((r) => r.scanId === 's1')?.action).toBe('block');
      expect(results.find((r) => r.scanId === 's2')?.action).toBe('allow');
    });

    it('handles FAILED scans', async () => {
      mockScannerInstance.queryByScanIds.mockResolvedValueOnce([
        { scan_id: 's1', status: 'FAILED' },
      ]);

      const results = await service.pollResults(['s1'], 10);
      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('allow');
      expect(results[0].category).toBe('error');
    });
  });

  describe('submitBulkScan — edge cases', () => {
    it('returns empty array for empty prompts', async () => {
      const scanIds = await service.submitBulkScan('p', []);
      expect(mockScannerInstance.asyncScan).not.toHaveBeenCalled();
      expect(scanIds).toEqual([]);
    });

    it('exactly 5 prompts creates 1 batch (not 2)', async () => {
      mockScannerInstance.asyncScan.mockResolvedValue({
        received: '2026-03-09T00:00:00Z',
        scan_id: 'batch-5',
      });

      const prompts = Array.from({ length: 5 }, (_, i) => `p${i}`);
      const scanIds = await service.submitBulkScan('profile', prompts);
      expect(mockScannerInstance.asyncScan).toHaveBeenCalledTimes(1);
      expect(scanIds).toHaveLength(1);
      expect(mockScannerInstance.asyncScan.mock.calls[0][0]).toHaveLength(5);
    });

    it('6 prompts creates 2 batches (5 + 1)', async () => {
      mockScannerInstance.asyncScan
        .mockResolvedValueOnce({ received: '2026-03-09T00:00:00Z', scan_id: 'batch-a' })
        .mockResolvedValueOnce({ received: '2026-03-09T00:00:00Z', scan_id: 'batch-b' });

      const prompts = Array.from({ length: 6 }, (_, i) => `p${i}`);
      const scanIds = await service.submitBulkScan('profile', prompts);
      expect(mockScannerInstance.asyncScan).toHaveBeenCalledTimes(2);
      expect(scanIds).toEqual(['batch-a', 'batch-b']);
      expect(mockScannerInstance.asyncScan.mock.calls[0][0]).toHaveLength(5);
      expect(mockScannerInstance.asyncScan.mock.calls[1][0]).toHaveLength(1);
    });
  });

  describe('pollResults — edge cases', () => {
    it('handles mix of COMPLETED and FAILED statuses in single poll', async () => {
      mockScannerInstance.queryByScanIds.mockResolvedValueOnce([
        {
          scan_id: 's1',
          status: 'COMPLETED',
          result: { scan_id: 's1', report_id: 'r1', action: 'block', category: 'malicious' },
        },
        { scan_id: 's2', status: 'FAILED' },
        {
          scan_id: 's3',
          status: 'COMPLETED',
          result: { scan_id: 's3', report_id: 'r3', action: 'allow', category: 'benign' },
        },
      ]);

      const results = await service.pollResults(['s1', 's2', 's3'], 10);
      expect(results).toHaveLength(3);
      expect(results[0].action).toBe('block');
      expect(results[1].action).toBe('allow');
      expect(results[1].category).toBe('error');
      expect(results[2].action).toBe('allow');
      expect(results[2].category).toBe('benign');
    });
  });

  describe('formatResultsCsv', () => {
    it('produces CSV with header and data rows', () => {
      const results = [
        {
          prompt: 'hello',
          response: undefined,
          scanId: 's1',
          reportId: 'r1',
          action: 'allow' as const,
          category: 'benign',
          triggered: false,
          detections: {},
        },
        {
          prompt: 'hack it',
          response: undefined,
          scanId: 's2',
          reportId: 'r2',
          action: 'block' as const,
          category: 'malicious',
          triggered: true,
          detections: { injection: true },
        },
      ];

      const csv = SdkRuntimeService.formatResultsCsv(results);
      const lines = csv.split('\n');
      expect(lines[0]).toBe('prompt,action,category,triggered,scan_id,report_id');
      expect(lines[1]).toBe('"hello","allow","benign","false","s1","r1"');
      expect(lines[2]).toBe('"hack it","block","malicious","true","s2","r2"');
    });

    it('escapes quotes in prompt text', () => {
      const results = [
        {
          prompt: 'say "hello"',
          response: undefined,
          scanId: 's1',
          reportId: 'r1',
          action: 'allow' as const,
          category: 'benign',
          triggered: false,
          detections: {},
        },
      ];

      const csv = SdkRuntimeService.formatResultsCsv(results);
      expect(csv).toContain('"say ""hello"""');
    });

    it('handles prompts with commas (CSV escaping)', () => {
      const results = [
        {
          prompt: 'hello, world, test',
          response: undefined,
          scanId: 's1',
          reportId: 'r1',
          action: 'allow' as const,
          category: 'benign',
          triggered: false,
          detections: {},
        },
      ];

      const csv = SdkRuntimeService.formatResultsCsv(results);
      const lines = csv.split('\n');
      // prompt is wrapped in quotes so commas don't break CSV parsing
      expect(lines[1]).toBe('"hello, world, test","allow","benign","false","s1","r1"');
    });

    it('returns header only for empty results array', () => {
      const csv = SdkRuntimeService.formatResultsCsv([]);
      expect(csv).toBe('prompt,action,category,triggered,scan_id,report_id');
    });
  });
});
