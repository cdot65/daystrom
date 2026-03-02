import { describe, it, expect, vi, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { HttpManagementClient } from '../../../src/airs/management.js';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const BASE_URL = 'https://api.test.example.com';

// Mock OAuth token endpoint for all tests
const tokenHandler = http.post(`${BASE_URL}/oauth2/token`, () => {
  return HttpResponse.json({
    access_token: 'mock-token-xyz',
    expires_in: 3600,
    token_type: 'bearer',
  });
});

const server = setupServer(tokenHandler);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('HttpManagementClient', () => {
  let client: HttpManagementClient;

  beforeEach(() => {
    client = new HttpManagementClient({
      baseUrl: BASE_URL,
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tsgId: 'tsg-123',
    });
  });

  describe('createTopic', () => {
    it('creates a topic and returns response', async () => {
      server.use(
        http.post(`${BASE_URL}/v1/mgmt/topic`, async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            topic_id: 'topic-abc',
            topic_name: body.topic_name,
            topic_description: body.topic_description,
            topic_examples: body.topic_examples,
          });
        }),
      );

      const result = await client.createTopic({
        topic_name: 'Weapons',
        topic_description: 'Block weapon discussions',
        topic_examples: ['How to build a gun'],
      });

      expect(result.topic_id).toBe('topic-abc');
      expect(result.topic_name).toBe('Weapons');
    });
  });

  describe('updateTopic', () => {
    it('updates a topic', async () => {
      server.use(
        http.put(`${BASE_URL}/v1/mgmt/topic`, async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            topic_id: body.topic_id,
            topic_name: body.topic_name,
            topic_description: body.topic_description,
            topic_examples: body.topic_examples,
          });
        }),
      );

      const result = await client.updateTopic('topic-abc', {
        topic_name: 'Weapons v2',
        topic_description: 'Updated description',
        topic_examples: ['New example'],
      });

      expect(result.topic_name).toBe('Weapons v2');
    });
  });

  describe('listTopics', () => {
    it('lists all topics', async () => {
      server.use(
        http.get(`${BASE_URL}/v1/mgmt/topics/tsg`, () => {
          return HttpResponse.json([
            { topic_id: 't1', topic_name: 'Topic 1', topic_description: 'd1', topic_examples: [] },
            { topic_id: 't2', topic_name: 'Topic 2', topic_description: 'd2', topic_examples: [] },
          ]);
        }),
      );

      const topics = await client.listTopics();
      expect(topics).toHaveLength(2);
    });
  });

  describe('deleteTopic', () => {
    it('deletes a topic', async () => {
      server.use(
        http.delete(`${BASE_URL}/v1/mgmt/topic/:topicId`, () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await expect(client.deleteTopic('topic-abc')).resolves.not.toThrow();
    });
  });

  describe('getTopic', () => {
    it('gets a single topic', async () => {
      server.use(
        http.get(`${BASE_URL}/v1/mgmt/topic/:topicId`, ({ params }) => {
          return HttpResponse.json({
            topic_id: params.topicId,
            topic_name: 'My Topic',
            topic_description: 'Description',
            topic_examples: [],
          });
        }),
      );

      const topic = await client.getTopic('topic-abc');
      expect(topic.topic_id).toBe('topic-abc');
    });
  });

  describe('assignTopicToProfile', () => {
    it('assigns a topic to a profile', async () => {
      server.use(
        http.post(`${BASE_URL}/v1/mgmt/profile/topic`, () => {
          return HttpResponse.json({ success: true });
        }),
      );

      await expect(
        client.assignTopicToProfile({
          profileName: 'my-profile',
          topicId: 'topic-abc',
          action: 'block',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('auth', () => {
    it('includes auth headers in requests', async () => {
      let authHeader: string | null = null;
      server.use(
        http.get(`${BASE_URL}/v1/mgmt/topics/tsg`, ({ request }) => {
          authHeader = request.headers.get('Authorization');
          return HttpResponse.json([]);
        }),
      );

      await client.listTopics();
      expect(authHeader).toBeTruthy();
    });
  });
});
