import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SdkManagementService } from '../../../src/airs/management.js';

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

      const call = mockProfileUpdate.mock.calls[0][1];
      const aiProfiles = call.policy['ai-security-profiles'];
      const modelProtection = aiProfiles[0]['model-configuration']['model-protection'];
      const tg = modelProtection.find((mp: any) => mp.name === 'topic-guardrails');
      expect(tg).toBeDefined();
      const blockEntry = tg['topic-list'].find((tl: any) => tl.action === 'block');
      expect(blockEntry.topic).toEqual([
        { topic_id: 'topic-1', topic_name: 'Weapons', revision: 1 },
      ]);
    });

    it('creates action entry when topic-guardrails exists but action missing', async () => {
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
                        'topic-list': [{ action: 'allow', topic: [] }],
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

      const call = mockProfileUpdate.mock.calls[0][1];
      const tg = call.policy['ai-security-profiles'][0]['model-configuration'][
        'model-protection'
      ].find((mp: any) => mp.name === 'topic-guardrails');
      const blockEntry = tg['topic-list'].find((tl: any) => tl.action === 'block');
      expect(blockEntry).toBeDefined();
      expect(blockEntry.topic).toHaveLength(1);
    });

    it('returns early without update when topic already linked', async () => {
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
                            topic: [{ topic_id: 'topic-1', topic_name: 'Weapons', revision: 1 }],
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

      await service.assignTopicToProfile('test-profile', 'topic-1', 'Weapons', 'block');

      expect(mockProfileUpdate).not.toHaveBeenCalled();
    });

    it('adds topic to existing action entry', async () => {
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
                            topic: [{ topic_id: 'topic-old', topic_name: 'Old', revision: 1 }],
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

      await service.assignTopicToProfile('test-profile', 'topic-new', 'New Topic', 'block');

      const call = mockProfileUpdate.mock.calls[0][1];
      const tg = call.policy['ai-security-profiles'][0]['model-configuration'][
        'model-protection'
      ].find((mp: any) => mp.name === 'topic-guardrails');
      const blockEntry = tg['topic-list'].find((tl: any) => tl.action === 'block');
      expect(blockEntry.topic).toHaveLength(2);
      expect(blockEntry.topic[1].topic_id).toBe('topic-new');
    });

    it('works with action=allow', async () => {
      mockProfileList.mockResolvedValue({
        ai_profiles: [
          { profile_id: 'p-1', profile_name: 'test-profile', active: true, policy: {} },
        ],
      });
      mockProfileUpdate.mockResolvedValue({});

      await service.assignTopicToProfile('test-profile', 'topic-1', 'Safe Topic', 'allow');

      const call = mockProfileUpdate.mock.calls[0][1];
      const tg = call.policy['ai-security-profiles'][0]['model-configuration'][
        'model-protection'
      ].find((mp: any) => mp.name === 'topic-guardrails');
      const allowEntry = tg['topic-list'].find((tl: any) => tl.action === 'allow');
      expect(allowEntry.topic).toEqual([
        { topic_id: 'topic-1', topic_name: 'Safe Topic', revision: 1 },
      ]);
    });
  });
});
