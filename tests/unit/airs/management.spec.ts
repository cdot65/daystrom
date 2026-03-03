import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SdkManagementService } from '../../../src/airs/management.js';

// Mock the SDK ManagementClient
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockList = vi.fn();
const mockForceDelete = vi.fn();

vi.mock('@cdot65/prisma-airs-sdk', () => ({
  ManagementClient: vi.fn().mockImplementation(() => ({
    topics: {
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      list: mockList,
      forceDelete: mockForceDelete,
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
});
