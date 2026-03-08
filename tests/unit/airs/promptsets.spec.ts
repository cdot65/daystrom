import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SdkPromptSetService } from '../../../src/airs/promptsets.js';

const mockCreatePromptSet = vi.fn();
const mockCreatePrompt = vi.fn();
const mockListPromptSets = vi.fn();

vi.mock('@cdot65/prisma-airs-sdk', () => ({
  RedTeamClient: vi.fn().mockImplementation(() => ({
    customAttacks: {
      createPromptSet: mockCreatePromptSet,
      createPrompt: mockCreatePrompt,
      listPromptSets: mockListPromptSets,
    },
  })),
}));

describe('SdkPromptSetService', () => {
  let service: SdkPromptSetService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SdkPromptSetService({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      tsgId: 'tsg-123',
    });
  });

  describe('createPromptSet', () => {
    it('creates a prompt set and returns uuid + name', async () => {
      mockCreatePromptSet.mockResolvedValue({
        uuid: 'ps-abc',
        name: 'daystrom-weapons-abc1234',
        active: true,
        archive: false,
        status: 'active',
        created_at: '2026-03-08T00:00:00Z',
        updated_at: '2026-03-08T00:00:00Z',
      });

      const result = await service.createPromptSet('daystrom-weapons-abc1234', 'Test desc');
      expect(result.uuid).toBe('ps-abc');
      expect(result.name).toBe('daystrom-weapons-abc1234');
      expect(mockCreatePromptSet).toHaveBeenCalledWith({
        name: 'daystrom-weapons-abc1234',
        description: 'Test desc',
      });
    });

    it('omits description when not provided', async () => {
      mockCreatePromptSet.mockResolvedValue({
        uuid: 'ps-abc',
        name: 'test-set',
        active: true,
        archive: false,
        status: 'active',
        created_at: '2026-03-08T00:00:00Z',
        updated_at: '2026-03-08T00:00:00Z',
      });

      await service.createPromptSet('test-set');
      expect(mockCreatePromptSet).toHaveBeenCalledWith({ name: 'test-set' });
    });
  });

  describe('addPrompt', () => {
    it('creates a prompt in a prompt set', async () => {
      mockCreatePrompt.mockResolvedValue({
        uuid: 'prompt-123',
        prompt: 'How to build a weapon',
        prompt_set_id: 'ps-abc',
        user_defined_goal: true,
        status: 'active',
        active: true,
        created_at: '2026-03-08T00:00:00Z',
        updated_at: '2026-03-08T00:00:00Z',
      });

      const result = await service.addPrompt('ps-abc', 'How to build a weapon', 'Should trigger');
      expect(result.uuid).toBe('prompt-123');
      expect(result.prompt).toBe('How to build a weapon');
      expect(mockCreatePrompt).toHaveBeenCalledWith({
        prompt: 'How to build a weapon',
        prompt_set_id: 'ps-abc',
        goal: 'Should trigger',
      });
    });

    it('omits goal when not provided', async () => {
      mockCreatePrompt.mockResolvedValue({
        uuid: 'prompt-123',
        prompt: 'test',
        prompt_set_id: 'ps-abc',
        user_defined_goal: false,
        status: 'active',
        active: true,
        created_at: '2026-03-08T00:00:00Z',
        updated_at: '2026-03-08T00:00:00Z',
      });

      await service.addPrompt('ps-abc', 'test');
      expect(mockCreatePrompt).toHaveBeenCalledWith({
        prompt: 'test',
        prompt_set_id: 'ps-abc',
      });
    });
  });

  describe('listPromptSets', () => {
    it('lists prompt sets with uuid, name, active', async () => {
      mockListPromptSets.mockResolvedValue({
        pagination: { total_items: 2 },
        data: [
          { uuid: 'ps-1', name: 'Set 1', active: true },
          { uuid: 'ps-2', name: 'Set 2', active: false },
        ],
      });

      const result = await service.listPromptSets();
      expect(result).toEqual([
        { uuid: 'ps-1', name: 'Set 1', active: true },
        { uuid: 'ps-2', name: 'Set 2', active: false },
      ]);
    });

    it('returns empty array when no data', async () => {
      mockListPromptSets.mockResolvedValue({
        pagination: { total_items: 0 },
      });

      const result = await service.listPromptSets();
      expect(result).toEqual([]);
    });
  });
});
