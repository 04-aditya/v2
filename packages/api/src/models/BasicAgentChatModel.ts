import { logger } from '@/utils/logger';
import { IChatModel } from '@sharedtypes';
import { AgentActionOutputParser, AgentExecutor, LLMSingleActionAgent } from 'langchain/agents';
import { LLMChain } from 'langchain/chains';
import { ConversationSummaryMemory } from 'langchain/memory';
import { ChatOpenAI, OpenAIInput } from 'langchain/chat_models/openai';
import { BaseChatPromptTemplate, BasePromptTemplate, SerializedBasePromptTemplate, renderTemplate } from 'langchain/prompts';
import { AgentAction, AgentFinish, AgentStep, BaseChatMessage, HumanChatMessage, InputValues, PartialValues } from 'langchain/schema';
import { BingSerpAPI, DynamicTool, Tool } from 'langchain/tools';
import { Calculator } from 'langchain/tools/calculator';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { BaseLanguageModelParams } from 'langchain/dist/base_language';
import { UnitConvertorTool } from './tools/unitconvertor';
import { AzureOpenAI } from './AzureChatModel';
import { format as formatDate } from 'date-fns';
import { UserEntity } from '@/entities/user.entity';
import { BingAPI } from './tools/BingAPI';

const PREFIX = (date: Date, user?: UserEntity) =>
  `Answer the following questions as best you can. Your a AI assistant called PSChat that uses Large Language Models (LLM)` +
  ` You should know that current year is ${formatDate(date, 'yyyy')} ` +
  `and today is ${formatDate(date, 'iiii')} ${formatDate(date, 'do')} of ${formatDate(date, 'MMMM')}. ` +
  `Your are helping a Human named maskedhumanname, who is working at Publicis Sapient${user ? `, as ${user.business_title}` : ''}.` +
  ` You have access to the following tools:`;

const formatInstructions = (
  toolNames: string,
) => `First try to provide a initial answer, if unable to provide a answer, Try to arrive at the Final Answer by using the following format:

Human: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [${toolNames}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat 0 or N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question`;

const SUFFIX = `Begin!
Current conversation:
{chat_history}

Human: {input}
Thought: {agent_scratchpad}`;

class CustomPromptTemplate extends BaseChatPromptTemplate {
  tools: Tool[];
  maxIterations: number;
  setLastInput?: (msg: string) => void;
  currentUser?: UserEntity;
  constructor(args: { tools: Tool[]; inputVariables: string[]; setLastInput?: (msg: string) => void; currentUser?: UserEntity }) {
    super({ inputVariables: args.inputVariables });
    this.tools = args.tools;
    this.setLastInput = args.setLastInput;
    this.currentUser = args.currentUser;
  }

  _getPromptType(): string {
    throw new Error('Not implemented');
  }

  async formatMessages(values: InputValues): Promise<BaseChatMessage[]> {
    /** Construct the final template */
    const toolStrings = this.tools.map(tool => `${tool.name}: ${tool.description}`).join('\n');
    const toolNames = this.tools.map(tool => tool.name).join('\n');
    const instructions = formatInstructions(toolNames);
    const template = [PREFIX(new Date(), this.currentUser), toolStrings, instructions, SUFFIX].join('\n\n');
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
      let lastInput = `🤔 `;

      lastInput += intermediateSteps.reduce(
        (thoughts, { action, observation }, i) =>
          thoughts +
          [
            action.log.split('Action:')[0],
            `\n🤔 I will \`${action.tool}\` to process \n\`${action.toolInput}\`\n`,
            '\n*Observation:* ' + observation + '\n',
            i < intermediateSteps.length - 1 ? '💡 \n' : '🧠',
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
      const finalAnswers = { output: input };
      return { log: text, returnValues: finalAnswers };
    }

    const match = /Action: (.*)\nAction Input: (.*)/s.exec(text);
    if (!match) {
      // throw new Error(`Could not parse LLM output: ${text}`);
      return {
        log: text,
        returnValues: {
          // output: `Stopping here as I am unable to determine next action.\n\n ${text}`,
          output: `${text}`,
        },
      };
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

  async call(input: { role?: string; content: string }[], options?: Record<string, any>): Promise<{ content: string } & Record<string, any>> {
    // const model = new ChatOpenAI({ temperature: options.temperature as number });
    const model = new AzureOpenAI({});
    const memory = new ConversationSummaryMemory({
      memoryKey: 'chat_history',
      llm: model,
    });
    //an array to store a set of followup questions
    const followupQuestions: string[] = [];

    // https://learn.microsoft.com/en-us/bing/search-apis/bing-web-search/reference/query-parameters
    const searchTool = new BingAPI(process.env.BINGSERPAPI_API_KEY, {
      answerCount: '3', //webpages, images, videos, and relatedSearches
      count: '5', //
      promote: 'Webpages',
      responseFilter: 'Webpages',
      safeSearch: 'Strict',
    });
    searchTool.name = 'search bing';
    const calcTool = new Calculator();
    calcTool.name = 'use calculator';
    const tools = [
      searchTool,
      calcTool,
      new UnitConvertorTool(),
      // new DynamicTool({
      //   name: 'ask maskedhumanname',
      //   description:
      //     `Useful for getting more clarifications from maskedhumanname.` +
      //     `Use this tool only when it is absolutely necessary and it is not possible to proceed furher.` +
      //     `The input to this tool should be a set questions with one question in each line.`,
      //   func: (input: string) => {
      //     followupQuestions.push(input);
      //     return Promise.resolve(`Stop further actions and wait for the futher information.`);
      //   },
      // }),
    ];

    let lastIntermediateSet = '';
    const llmChain = new LLMChain({
      prompt: new CustomPromptTemplate({
        tools,
        inputVariables: ['input', 'chat_history', 'agent_scratchpad'],
        setLastInput: msg => (lastIntermediateSet = msg),
        currentUser: options?.user,
      }),
      llm: model,
      memory: memory,
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

    function unmaskname(input: string) {
      return input.replace(/maskedhumanname/g, `${options?.user?.first_name || 'user'}`);
    }

    try {
      const response = await executor.call({ input: inputMsg });

      logger.debug(`Got response`);

      logger.debug(JSON.stringify(response, null, 2));
      const result = {
        content: unmaskname(response.output),
        options: {
          intermediate_content: unmaskname(lastIntermediateSet),
          followup_questions: followupQuestions.map(unmaskname),
        },
      };

      return result;
    } catch (ex) {
      const result = {
        content: '**Error:**\n' + ex.message,
        options: {
          intermediate_content: lastIntermediateSet,
        },
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
