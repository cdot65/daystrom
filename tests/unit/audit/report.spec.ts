import { describe, expect, it } from 'vitest';
import { buildAuditReportHtml, buildAuditReportJson } from '../../../src/audit/report.js';
import type { AuditResult } from '../../../src/audit/types.js';
import { mockMetrics } from '../../helpers/mocks.js';

function makeAuditResult(overrides: Partial<AuditResult> = {}): AuditResult {
  return {
    profileName: 'test-profile',
    timestamp: '2026-01-01T00:00:00Z',
    topics: [
      {
        topic: {
          topicId: 't1',
          topicName: 'Weapons',
          action: 'block',
          description: 'Block weapons',
          examples: ['gun talk'],
        },
        testResults: [],
        metrics: mockMetrics({ coverage: 0.85, accuracy: 0.9 }),
      },
    ],
    compositeMetrics: mockMetrics({ coverage: 0.85 }),
    conflicts: [],
    ...overrides,
  };
}

describe('buildAuditReportJson', () => {
  it('maps audit result to structured JSON', () => {
    const result = makeAuditResult();
    const json = buildAuditReportJson(result);

    expect(json.version).toBe(1);
    expect(json.profileName).toBe('test-profile');
    expect(json.compositeMetrics.coverage).toBe(0.85);
    expect(json.topics).toHaveLength(1);
    expect(json.topics[0].name).toBe('Weapons');
    expect(json.topics[0].action).toBe('block');
    expect(json.topics[0].metrics.coverage).toBe(0.85);
  });

  it('includes conflicts', () => {
    const result = makeAuditResult({
      conflicts: [
        {
          topicA: 'Weapons',
          topicB: 'Education',
          description: 'overlap',
          evidence: ['chem lab'],
        },
      ],
    });
    const json = buildAuditReportJson(result);
    expect(json.conflicts).toHaveLength(1);
    expect(json.conflicts[0].topicA).toBe('Weapons');
  });

  it('handles empty topics', () => {
    const result = makeAuditResult({ topics: [] });
    const json = buildAuditReportJson(result);
    expect(json.topics).toEqual([]);
  });
});

describe('buildAuditReportHtml', () => {
  it('produces valid HTML document', () => {
    const html = buildAuditReportHtml(makeAuditResult());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
    expect(html).toContain('<style>');
  });

  it('is self-contained', () => {
    const html = buildAuditReportHtml(makeAuditResult());
    expect(html).not.toMatch(/<link[^>]+href="http/);
    expect(html).not.toMatch(/<script[^>]+src="http/);
  });

  it('includes profile name and metrics', () => {
    const html = buildAuditReportHtml(makeAuditResult());
    expect(html).toContain('test-profile');
    expect(html).toContain('85.0%');
  });

  it('includes topic rows', () => {
    const html = buildAuditReportHtml(makeAuditResult());
    expect(html).toContain('Weapons');
    expect(html).toContain('block');
  });

  it('renders conflict section when present', () => {
    const result = makeAuditResult({
      conflicts: [
        {
          topicA: 'Weapons',
          topicB: 'Education',
          description: 'overlap detected',
          evidence: ['chem lab'],
        },
      ],
    });
    const html = buildAuditReportHtml(result);
    expect(html).toContain('Weapons');
    expect(html).toContain('Education');
    expect(html).toContain('overlap detected');
    expect(html).toContain('chem lab');
  });

  it('shows no conflicts message when empty', () => {
    const html = buildAuditReportHtml(makeAuditResult());
    expect(html).toContain('No cross-topic conflicts detected');
  });

  it('escapes HTML in topic names', () => {
    const result = makeAuditResult({
      topics: [
        {
          topic: {
            topicId: 't1',
            topicName: '<script>xss</script>',
            action: 'block',
            description: 'test',
            examples: [],
          },
          testResults: [],
          metrics: mockMetrics(),
        },
      ],
    });
    const html = buildAuditReportHtml(result);
    expect(html).not.toContain('<script>xss');
    expect(html).toContain('&lt;script&gt;');
  });
});
