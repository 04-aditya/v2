
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
  contexts: {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
  }[],
  call?: (input: {role:string, content: string}[], options?: Record<string, unknown>) => Promise<{ content: string } & Record<string, any>>;
}
