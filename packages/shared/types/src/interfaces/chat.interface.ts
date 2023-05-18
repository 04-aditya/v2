
export interface IChatMessage {
  id: number;
  role: 'user' | 'system' | 'assistant';
  content: string;
  index: number;
  options?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  partial?: boolean;
};
export interface IChatSession {
  id: string;
  userid: string;
  name?: string;
  type: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  messages: Array<IChatMessage>;
  options?: Record<string, any>;
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

export interface IChatContext {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface IChatModelCallParams {
  input: {role:string, content: string}[],
  options?: Record<string, any>;
}
export interface IChatModel {
  id: string;
  name: string;
  group: string;
  enabled: boolean;
  tools: {
    id: string;
    name: string;
    description: string;
  }[],
  contexts: IChatContext[],
  refresh?: () => Promise<void>;
  call?: (data:IChatModelCallParams) => Promise<{ content: string } & Record<string, any>>;
}
