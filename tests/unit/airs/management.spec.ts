import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SdkManagementService } from '../../../src/airs/management.js';

interface PolicyTopicEntry {
  topic_id: string;
  topic_name: string;
  revision: number;
}
interface PolicyActionEntry {
  action: string;
  topic: PolicyTopicEntry[];
}
interface PolicyProtectionEntry {
  name: string;
  'topic-list': PolicyActionEntry[];
}

/** Extract topic-guardrails from an update call's policy */
function getTopicGuardrails(call: Record<string, Record<string, unknown>>): PolicyProtectionEntry {
  const mp = call.policy['ai-security-profiles'] as Record<string, Record<string, unknown>>[];
  const protection = mp[0]['model-configuration']['model-protection'] as PolicyProtectionEntry[];
  const tg = protection.find((p) => p.name === 'topic-guardrails');
  if (!tg) throw new Error('topic-guardrails not found in policy');
  return tg;
}

// Mock the SDK ManagementClient
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockList = vi.fn();
const mockForceDelete = vi.fn();
const mockProfileList = vi.fn();
const mockProfileUpdate = vi.fn();

vi.mock('@cdot65/prisma-airs-sdk', () => ({
  ManagementClient: vi.fn().mockImplementation(() => ({
    topics: {
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      list: mockList,
      forceDelete: mockForceDelete,
    },
    profiles: {
      list: mockProfileList,
      update: mockProfileUpdate,
    },
  })),
}));

describe('SdkManagementService', () => {
  let service: SdkManagementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SdkManagementService({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      tsgId: 'tsg-123',
    });
  });

  describe('createTopic', () => {
    it('creates a topic via SDK and returns response', async () => {
      mockCreate.mockResolvedValue({
        topic_id: 'topic-abc',
        topic_name: 'Weapons',
        description: 'Block weapon discussions',
        examples: ['How to build a gun'],
        active: true,
      });

      const result = await service.createTopic({
        topic_name: 'Weapons',
        description: 'Block weapon discussions',
        examples: ['How to build a gun'],
        active: true,
      });

      expect(result.topic_id).toBe('topic-abc');
      expect(result.topic_name).toBe('Weapons');
      expect(mockCreate).toHaveBeenCalledWith({
        topic_name: 'Weapons',
        description: 'Block weapon discussions',
        examples: ['How to build a gun'],
        active: true,
      });
    });
  });

  describe('updateTopic', () => {
    it('updates a topic via SDK', async () => {
      mockUpdate.mockResolvedValue({
        topic_id: 'topic-abc',
        topic_name: 'Weapons v2',
        description: 'Updated description',
        examples: ['New example'],
        active: true,
      });

      const result = await service.updateTopic('topic-abc', {
        topic_name: 'Weapons v2',
        description: 'Updated description',
        examples: ['New example'],
      });

      expect(result.topic_name).toBe('Weapons v2');
      expect(mockUpdate).toHaveBeenCalledWith('topic-abc', {
        topic_name: 'Weapons v2',
        description: 'Updated description',
        examples: ['New example'],
      });
    });
  });

  describe('deleteTopic', () => {
    it('deletes a topic via SDK', async () => {
      mockDelete.mockResolvedValue({ message: 'deleted' });

      await expect(service.deleteTopic('topic-abc')).resolves.not.toThrow();
      expect(mockDelete).toHaveBeenCalledWith('topic-abc');
    });
  });

  describe('listTopics', () => {
    it('lists topics and unwraps custom_topics array', async () => {
      mockList.mockResolvedValue({
        custom_topics: [
          { topic_id: 't1', topic_name: 'Topic 1', description: 'd1', examples: [] },
          { topic_id: 't2', topic_name: 'Topic 2', description: 'd2', examples: [] },
        ],
        next_offset: undefined,
      });

      const topics = await service.listTopics();
      expect(topics).toHaveLength(2);
      expect(topics[0].topic_id).toBe('t1');
      expect(topics[1].topic_id).toBe('t2');
    });

    it('returns empty array when no topics', async () => {
      mockList.mockResolvedValue({ custom_topics: [] });

      const topics = await service.listTopics();
      expect(topics).toEqual([]);
    });
  });

  describe('assignTopicToProfile', () => {
    it('throws when profile not found', async () => {
      mockProfileList.mockResolvedValue({ ai_profiles: [] });

      await expect(
        service.assignTopicToProfile('missing-profile', 'topic-1', 'Weapons', 'block'),
      ).rejects.toThrow('Profile "missing-profile" not found');
    });

    it('creates full topic-guardrails structure when policy is empty', async () => {
      mockProfileList.mockResolvedValue({
        ai_profiles: [
          { profile_id: 'p-1', profile_name: 'test-profile', active: true, policy: {} },
        ],
      });
      mockProfileUpdate.mockResolvedValue({});

      await service.assignTopicToProfile('test-profile', 'topic-1', 'Weapons', 'block');

      expect(mockProfileUpdate).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({
          profile_name: 'test-profile',
          active: true,
        }),
      );

      const tg = getTopicGuardrails(mockProfileUpdate.mock.calls[0][1]);
      const blockEntry = tg['topic-list'].find((tl) => tl.action === 'block');
      expect(blockEntry?.topic).toEqual([
        { topic_id: 'topic-1', topic_name: 'Weapons', revision: 1 },
      ]);
      // Opposite action should be empty
      const allowEntry = tg['topic-list'].find((tl) => tl.action === 'allow');
      expect(allowEntry?.topic).toEqual([]);
    });

    it('handles profile with no policy (undefined)', async () => {
      mockProfileList.mockResolvedValue({
        ai_profiles: [{ profile_id: 'p-1', profile_name: 'test-profile', active: true }],
      });
      mockProfileUpdate.mockResolvedValue({});

      await service.assignTopicToProfile('test-profile', 'topic-1', 'Weapons', 'block');

      const tg = getTopicGuardrails(mockProfileUpdate.mock.calls[0][1]);
      const blockEntry = tg['topic-list'].find((tl) => tl.action === 'block');
      expect(blockEntry?.topic).toHaveLength(1);
    });

    it('handles profile with ai-security-profiles but no model-configuration', async () => {
      mockProfileList.mockResolvedValue({
        ai_profiles: [
          {
            profile_id: 'p-1',
            profile_name: 'test-profile',
            active: true,
            policy: {
              'ai-security-profiles': [{ 'model-type': 'default' }],
            },
          },
        ],
      });
      mockProfileUpdate.mockResolvedValue({});

      await service.assignTopicToProfile('test-profile', 'topic-1', 'Weapons', 'block');

      const tg = getTopicGuardrails(mockProfileUpdate.mock.calls[0][1]);
      const blockEntry = tg['topic-list'].find((tl) => tl.action === 'block');
      expect(blockEntry?.topic).toHaveLength(1);
    });

    it('replaces stale topics from previous runs', async () => {
      mockProfileList.mockResolvedValue({
        ai_profiles: [
          {
            profile_id: 'p-1',
            profile_name: 'test-profile',
            active: true,
            policy: {
              'ai-security-profiles': [
                {
                  'model-type': 'default',
                  'model-configuration': {
                    'model-protection': [
                      {
                        name: 'topic-guardrails',
                        action: 'allow',
                        options: [],
                        'topic-list': [
                          {
                            action: 'block',
                            topic: [
                              { topic_id: 'stale-1', topic_name: 'Old Run 1', revision: 1 },
                              { topic_id: 'stale-2', topic_name: 'Old Run 2', revision: 1 },
                              { topic_id: 'stale-3', topic_name: 'Old Run 3', revision: 1 },
                            ],
                          },
                          { action: 'allow', topic: [] },
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      });
      mockProfileUpdate.mockResolvedValue({});

      await service.assignTopicToProfile('test-profile', 'topic-new', 'Current Run', 'block');

      const tg = getTopicGuardrails(mockProfileUpdate.mock.calls[0][1]);
      const blockEntry = tg['topic-list'].find((tl) => tl.action === 'block');
      // Only the current topic — stale ones removed
      expect(blockEntry?.topic).toEqual([
        { topic_id: 'topic-new', topic_name: 'Current Run', revision: 1 },
      ]);
    });

    it('always updates even when same topic already linked', async () => {
      mockProfileList.mockResolvedValue({
        ai_profiles: [
          {
            profile_id: 'p-1',
            profile_name: 'test-profile',
            active: true,
            policy: {
              'ai-security-profiles': [
                {
                  'model-type': 'default',
                  'model-configuration': {
                    'model-protection': [
                      {
                        name: 'topic-guardrails',
                        action: 'allow',
                        options: [],
                        'topic-list': [
                          {
                            action: 'block',
                            topic: [
                              { topic_id: 'topic-1', topic_name: 'Weapons', revision: 1 },
                              { topic_id: 'stale', topic_name: 'Stale', revision: 1 },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      });
      mockProfileUpdate.mockResolvedValue({});

      await service.assignTopicToProfile('test-profile', 'topic-1', 'Weapons', 'block');

      // Still calls update to remove stale topics
      expect(mockProfileUpdate).toHaveBeenCalled();
      const tg = getTopicGuardrails(mockProfileUpdate.mock.calls[0][1]);
      const blockEntry = tg['topic-list'].find((tl) => tl.action === 'block');
      expect(blockEntry?.topic).toHaveLength(1);
      expect(blockEntry?.topic[0].topic_id).toBe('topic-1');
    });

    it('clears opposite action list', async () => {
      mockProfileList.mockResolvedValue({
        ai_profiles: [
          {
            profile_id: 'p-1',
            profile_name: 'test-profile',
            active: true,
            policy: {
              'ai-security-profiles': [
                {
                  'model-type': 'default',
                  'model-configuration': {
                    'model-protection': [
                      {
                        name: 'topic-guardrails',
                        action: 'allow',
                        options: [],
                        'topic-list': [
                          {
                            action: 'allow',
                            topic: [{ topic_id: 'old-allow', topic_name: 'Old', revision: 1 }],
                          },
                          {
                            action: 'block',
                            topic: [{ topic_id: 'old-block', topic_name: 'Old', revision: 1 }],
                          },
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      });
      mockProfileUpdate.mockResolvedValue({});

      await service.assignTopicToProfile('test-profile', 'topic-1', 'Weapons', 'block');

      const tg = getTopicGuardrails(mockProfileUpdate.mock.calls[0][1]);
      const allowEntry = tg['topic-list'].find((tl) => tl.action === 'allow');
      expect(allowEntry?.topic).toEqual([]);
      const blockEntry = tg['topic-list'].find((tl) => tl.action === 'block');
      expect(blockEntry?.topic).toHaveLength(1);
    });

    it('works with action=allow', async () => {
      mockProfileList.mockResolvedValue({
        ai_profiles: [
          { profile_id: 'p-1', profile_name: 'test-profile', active: true, policy: {} },
        ],
      });
      mockProfileUpdate.mockResolvedValue({});

      await service.assignTopicToProfile('test-profile', 'topic-1', 'Safe Topic', 'allow');

      const tg = getTopicGuardrails(mockProfileUpdate.mock.calls[0][1]);
      const allowEntry = tg['topic-list'].find((tl) => tl.action === 'allow');
      expect(allowEntry?.topic).toEqual([
        { topic_id: 'topic-1', topic_name: 'Safe Topic', revision: 1 },
      ]);
      // Block list should be empty
      const blockEntry = tg['topic-list'].find((tl) => tl.action === 'block');
      expect(blockEntry?.topic).toEqual([]);
    });
  });
});
