import { logger } from '@/utils/logger';
import { IChatModel } from '@sharedtypes';
import { AutoGPT } from 'langchain/experimental/autogpt';
import { ReadFileTool, WriteFileTool, BingSerpAPI } from 'langchain/tools';
import { InMemoryFileStore } from 'langchain/stores/file/in_memory';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { Calculator } from 'langchain/tools/calculator';

export class AutoGPTChatModel implements IChatModel {
  readonly id = 'autogpt35';
  readonly name = 'AutoGPT (3.5)';
  readonly group = 'Experimental';
  readonly enabled = true;
  readonly contexts = [];
  readonly tools = [];

  async call(input: { role?: string; content: string }[], options?: Record<string, unknown>): Promise<{ content: string } & Record<string, any>> {
    const store = new InMemoryFileStore();

    const tools = [
      new ReadFileTool({ store }),
      new WriteFileTool({ store }),
      new BingSerpAPI(process.env.BINGSERPAPI_API_KEY, {
        location: 'Bangalore, India',
        hl: 'en',
        gl: 'us',
      }),
      new Calculator(),
    ];

    const vectorStore = new MemoryVectorStore(new OpenAIEmbeddings());
    const autogpt = AutoGPT.fromLLMAndTools(new ChatOpenAI({ temperature: 0 }), tools, {
      memory: vectorStore.asRetriever(),
      aiName: 'PSChatAutoBot',
      aiRole: 'Assistant',
    });
    const response = await autogpt.run(input.map(m => m.content));

    console.log(response);

    const result = {
      content: '',
    };

    return result;
  }

  toJSON(): IChatModel {
    return {
      id: this.id,
      name: this.name,
      group: this.group,
      enabled: this.enabled,
      contexts: this.contexts,
      tools: this.tools,
    };
  }
}
