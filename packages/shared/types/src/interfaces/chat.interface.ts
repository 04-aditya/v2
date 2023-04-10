
export interface IChatMessage {
  id: number;
  role: 'user' | 'system' | 'assistant';
  content: string;
  index: number;
};
export interface IChatSession {
  id: string;
  userid: string;
  name?: string;
  timestamp: Date;
  messages: Array<IChatMessage>;
  options?: {
    model: string,
    model_version: string,
    temperature: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
    max_tokens: number;
    stop?: string;
  } | Record<string, unknown>;
};
