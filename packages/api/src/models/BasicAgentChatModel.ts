import { logger } from '@/utils/logger';
import { IChatModel } from '@sharedtypes';
import { AgentActionOutputParser, AgentExecutor, LLMSingleActionAgent } from 'langchain/agents';
import { LLMChain } from 'langchain/chains';
import { ChatOpenAI, OpenAIInput } from 'langchain/chat_models/openai';
import { BaseChatPromptTemplate, BasePromptTemplate, SerializedBasePromptTemplate, renderTemplate } from 'langchain/prompts';
import { AgentAction, AgentFinish, AgentStep, BaseChatMessage, HumanChatMessage, InputValues, PartialValues } from 'langchain/schema';
import { BingSerpAPI, Tool } from 'langchain/tools';
import { Calculator } from 'langchain/tools/calculator';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { BaseLanguageModelParams } from 'langchain/dist/base_language';
import { UnitConvertorTool } from './tools/unitconvertor';
import { AzureOpenAI } from './AzureChatModel';

const PREFIX = `Answer the following questions as best you can. You should know that current year is 2023 and today is friday 28th of april. The Human is working at Publicis Sapient. You have access to the following tools:`;
const formatInstructions = (toolNames: string) => `Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [${toolNames}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question`;

const SUFFIX = `Begin!

Question: {input}
Thought:{agent_scratchpad}`;

class CustomPromptTemplate extends BaseChatPromptTemplate {
  tools: Tool[];
  maxIterations: number;
  setLastInput?: (msg: string) => void;
  constructor(args: { tools: Tool[]; inputVariables: string[]; setLastInput?: (msg: string) => void }) {
    super({ inputVariables: args.inputVariables });
    this.tools = args.tools;
    this.setLastInput = args.setLastInput;
  }

  _getPromptType(): string {
    throw new Error('Not implemented');
  }

  async formatMessages(values: InputValues): Promise<BaseChatMessage[]> {
    /** Construct the final template */
    const toolStrings = this.tools.map(tool => `${tool.name}: ${tool.description}`).join('\n');
    const toolNames = this.tools.map(tool => tool.name).join('\n');
    const instructions = formatInstructions(toolNames);
    const template = [PREFIX, toolStrings, instructions, SUFFIX].join('\n\n');
    /** Construct the agent_scratchpad */
    const intermediateSteps = values.intermediate_steps as AgentStep[];
    const agentScratchpad = intermediateSteps.reduce(
      (thoughts, { action, observation }) => thoughts + [action.log, `\nObservation: ${observation}`, 'Thought:'].join('\n'),
      '',
    );
    const newInput = { agent_scratchpad: agentScratchpad, ...values };
    /** Format the template. */
    const formatted = renderTemplate(template, 'f-string', newInput);
    if (this.setLastInput) {
      let lastInput = `*Thought:*\n`;

      lastInput += intermediateSteps.reduce(
        (thoughts, { action, observation }, i) =>
          thoughts +
          [
            action.log.split('Action:')[0],
            `\n*Next Step:* I will use \`${action.tool}\` to process \`${action.toolInput}\`\n`,
            i < intermediateSteps.length - 1 ? '*Thought:*\n' : '*Last Thought:*',
          ].join('\n'),
        '',
      );
      this.setLastInput(lastInput);
    }
    return [new HumanChatMessage(formatted)];
  }

  partial(_values: PartialValues): Promise<BasePromptTemplate> {
    throw new Error('Not implemented');
  }

  serialize(): SerializedBasePromptTemplate {
    throw new Error('Not implemented');
  }
}

class CustomOutputParser extends AgentActionOutputParser {
  async parse(text: string): Promise<AgentAction | AgentFinish> {
    if (text.includes('Final Answer:')) {
      const parts = text.split('Final Answer:');
      const input = parts.slice(-1)[0].trim();
      const finalAnswers = { output: input, detailedoutput: text };
      return { log: text, returnValues: finalAnswers };
    }

    const match = /Action: (.*)\nAction Input: (.*)/s.exec(text);
    if (!match) {
      // throw new Error(`Could not parse LLM output: ${text}`);
      return { log: text, returnValues: { output: `Stopping here as I am unable to determine next action.\n\n ${text}` } };
    }

    return {
      tool: match[1].trim(),
      toolInput: match[2].trim().replace(/^"+|"+$/g, ''),
      log: text,
    };
  }

  getFormatInstructions(): string {
    throw new Error('Not implemented');
  }
}

export class BasicAgentChatModel implements IChatModel {
  readonly id = 'basicagent1';
  readonly name = 'GPT3.5 with Tools';
  readonly group = 'Experimental';
  readonly enabled = true;
  readonly contexts = [];
  readonly tools = [];

  async call(input: { role?: string; content: string }[], options?: Record<string, unknown>): Promise<{ content: string } & Record<string, any>> {
    // const model = new ChatOpenAI({ temperature: options.temperature as number });
    const model = new AzureOpenAI({});

    const tools = [
      new BingSerpAPI(process.env.BINGSERPAPI_API_KEY, {
        location: 'Bangalore,India',
        hl: 'en',
        gl: 'in',
      }),
      new Calculator(),
      new UnitConvertorTool(),
    ];

    let lastIntermediateSet = '';
    const llmChain = new LLMChain({
      prompt: new CustomPromptTemplate({
        tools,
        inputVariables: ['input', 'agent_scratchpad'],
        setLastInput: msg => (lastIntermediateSet = msg),
      }),
      llm: model,
      verbose: true,
    });

    const agent = new LLMSingleActionAgent({
      llmChain,
      outputParser: new CustomOutputParser(),
      stop: ['\nObservation'],
    });
    const executor = new AgentExecutor({
      agent,
      tools,
      maxIterations: 20,
    });

    const inputMsg = input[input.length - 1].content;
    logger.debug(`Executing with input "${inputMsg}"...`);

    try {
      const response = await executor.call({ input: inputMsg });

      logger.debug(`Got response`);

      logger.debug(JSON.stringify(response, null, 2));
      const result = {
        content: lastIntermediateSet + '\n\n' + response.output,
      };

      return result;
    } catch (ex) {
      const result = {
        content: lastIntermediateSet + '\n\n' + '**Error:**\n' + ex.message,
      };
      return result;
    }
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
