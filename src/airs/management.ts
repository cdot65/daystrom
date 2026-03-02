import type {
  ManagementClient,
  CustomTopicCreateRequest,
  CustomTopicResponse,
  ProfileTopicAssignment,
} from './types.js';

export interface HttpManagementClientOptions {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  tsgId: string;
}

export class HttpManagementClient implements ManagementClient {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tsgId: string;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(opts: HttpManagementClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.tsgId = opts.tsgId;
  }

  private async getAuthToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // OAuth2 client credentials flow
    const tokenUrl = `${this.baseUrl}/oauth2/token`;
    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: `tsg_id:${this.tsgId}`,
      }),
    });

    if (!resp.ok) {
      throw new Error(`Auth failed: ${resp.status} ${resp.statusText}`);
    }

    const data = (await resp.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60_000;
    return this.accessToken;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.getAuthToken();
    const resp = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Management API error: ${resp.status} ${resp.statusText} - ${text}`);
    }

    if (resp.status === 204) return undefined as T;
    return resp.json() as Promise<T>;
  }

  async createTopic(topic: CustomTopicCreateRequest): Promise<CustomTopicResponse> {
    return this.request<CustomTopicResponse>('POST', '/v1/mgmt/topic', topic);
  }

  async updateTopic(
    topicId: string,
    topic: CustomTopicCreateRequest,
  ): Promise<CustomTopicResponse> {
    return this.request<CustomTopicResponse>('PUT', '/v1/mgmt/topic', {
      topic_id: topicId,
      ...topic,
    });
  }

  async deleteTopic(topicId: string): Promise<void> {
    await this.request<void>('DELETE', `/v1/mgmt/topic/${topicId}`);
  }

  async getTopic(topicId: string): Promise<CustomTopicResponse> {
    return this.request<CustomTopicResponse>('GET', `/v1/mgmt/topic/${topicId}`);
  }

  async listTopics(): Promise<CustomTopicResponse[]> {
    return this.request<CustomTopicResponse[]>('GET', '/v1/mgmt/topics/tsg');
  }

  async assignTopicToProfile(assignment: ProfileTopicAssignment): Promise<void> {
    await this.request<void>('POST', '/v1/mgmt/profile/topic', {
      profile_name: assignment.profileName,
      topic_id: assignment.topicId,
      action: assignment.action,
    });
  }
}
