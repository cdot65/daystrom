export interface ScanResult {
  scanId: string;
  reportId: string;
  action: 'allow' | 'block';
  triggered: boolean;
  category?: string;
  raw?: unknown;
}

export interface CustomTopicCreateRequest {
  topic_name: string;
  topic_description: string;
  topic_examples: string[];
}

export interface CustomTopicResponse {
  topic_id: string;
  topic_name: string;
  topic_description: string;
  topic_examples: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ProfileTopicAssignment {
  profileName: string;
  topicId: string;
  action: 'allow' | 'block';
}

export interface ScanService {
  scan(profileName: string, prompt: string): Promise<ScanResult>;
  scanBatch(profileName: string, prompts: string[], concurrency?: number): Promise<ScanResult[]>;
}

export interface ManagementClient {
  createTopic(topic: CustomTopicCreateRequest): Promise<CustomTopicResponse>;
  updateTopic(topicId: string, topic: CustomTopicCreateRequest): Promise<CustomTopicResponse>;
  deleteTopic(topicId: string): Promise<void>;
  getTopic(topicId: string): Promise<CustomTopicResponse>;
  listTopics(): Promise<CustomTopicResponse[]>;
  assignTopicToProfile(assignment: ProfileTopicAssignment): Promise<void>;
}
