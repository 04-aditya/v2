
export interface IChatMessage {
  id: number;
  role: 'user' | 'system' | 'assistant';
  content: string;
  index: number;
  options?: Record<string, unknown>;
};
export interface IChatSession {
  id: string;
  userid: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<IChatMessage>;
  options?: Record<string, unknown>;
  // {
  //   model: string,
  //   model_version: string,
  //   temperature: number;
  //   top_p: number;
  //   frequency_penalty: number;
  //   presence_penalty: number;
  //   max_tokens: number;
  //   stop?: string;
  // };
};
export interface IChatModel {
  id: string;
  name: string;
  group: string;
  enabled: boolean;
  contexts: {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
  }[]
}
