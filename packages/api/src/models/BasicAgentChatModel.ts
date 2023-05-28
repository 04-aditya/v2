import { logger } from '@/utils/logger';
import { IChatModel, IChatModelCallParams } from '@sharedtypes';
import { AgentActionOutputParser, AgentExecutor, LLMSingleActionAgent } from 'langchain/agents';
import { LLMChain } from 'langchain/chains';
import { ConversationSummaryMemory } from 'langchain/memory';
import { ChatOpenAI } from 'langchain/chat_models/openai';
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
import { DallETool } from './tools/DallETool';
import { RequestsGetTool, RequestsPostTool, AIPluginTool } from 'langchain/tools';
import { WebBrowser } from 'langchain/tools/webbrowser';
import { AzFileStore, AzReadFileTool, AzWriteFileTool } from './tools/AzFileTool';
import { BaseLLM, LLM } from 'langchain/llms/base';

const PREFIX = (date: Date, user?: UserEntity) =>
  `Assistant is a large language model trained by OpenAI named PSChat.

  Assistant is designed to be able to assist with a wide range of tasks, from answering simple questions to providing in-depth explanations and discussions on a wide range of topics. As a language model, Assistant is able to generate human-like text based on the input it receives, allowing it to engage in natural-sounding conversations and provide responses that are coherent and relevant to the topic at hand.

  Assistant is constantly learning and improving, and its capabilities are constantly evolving. It is able to process and understand large amounts of text, and can use this knowledge to provide accurate and informative responses to a wide range of questions. Additionally, Assistant is able to generate its own text based on the input it receives, allowing it to engage in discussions and provide explanations and descriptions on a wide range of topics.

  Overall, Assistant is a powerful system that can help with a wide range of tasks and provide valuable insights and information on a wide range of topics. Whether you need help with a specific question or just want to have a conversation about a particular topic, Assistant is here to assist.\n` +
  `You should also know that current year is ${formatDate(date, 'yyyy')} ` +
  `and today is ${formatDate(date, 'iiii')} ${formatDate(date, 'do')} of ${formatDate(date, 'MMMM')}. \n` +
  // `Your are helping a Human named maskedhumanname, who is working at Publicis Sapient${user ? `, as ${user.business_title}` : ''}.\n\n` +
  // `Use previous conversation summary for additional context:` +
  // `{chat_history}\n\n` +
  `Publicis Sapient (PS) Primary brand colors are #FE414D(radiant-red), #FFFFFF(white) and light-gray(#EEEEEE) and ` +
  `Publicis Sapient (PS) secondary brand colors are  #079FFF(Blue), #FFE63B(yellow) and #00E6C3(green) . \n\n` +
  `TOOLS
  ------
  Assistant can ask the user to use tools to look up information that may be helpful in answering the users original question. The tools the human can use are:\n`;

const formatInstructions = (toolNames: string) => `The summary of the previous conversation:
{chat_history}

ALWAYS use the following format:

Question: the input question you must answer
Thought: you should always think about what to do in terms of Action/Action Input/Observation in the following format.
Action: the action to take, should be one of [${toolNames}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat 0 or N times)
Thought: I now know the final answer or I will stop here with most likely answer.
Final Answer: the final answer or most likely answer to the original input question`;

const SUFFIX = `Begin! Reminder to ALWAYS use the above format, and to use tools if appropriate.!

Question: {input}
Thought: {agent_scratchpad}`;

class CustomPromptTemplate extends BaseChatPromptTemplate {
  tools: Tool[];
  maxIterations: number;
  setLastInput?: (msg: string, intermediateSteps: AgentStep[]) => void;
  currentUser?: UserEntity;
  constructor(args: {
    tools: Tool[];
    inputVariables: string[];
    setLastInput?: (msg: string, intermediateSteps: AgentStep[]) => void;
    currentUser?: UserEntity;
  }) {
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
            `\n🤔 I will use \`${action.tool}\` to process \n\`${action.toolInput}\`\n`,
            '\n*Observation:* \n\n' + observation + '\n',
            i < intermediateSteps.length - 1 ? '💡 \n' : '',
          ].join('\n'),
        '',
      );
      this.setLastInput(lastInput, intermediateSteps);
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
      //const parts = text.split('Final Answer:');
      //const input = '🧠 ' + text.replace(/Final Answer:/g, '\n\n').trim();
      const input = text.replace(/Final Answer:/g, '\n\n').trim();
      // const input = parts.slice(-1)[0].trim();
      const finalAnswers = { output: input };
      return { log: text, returnValues: finalAnswers };
    }

    const match = /Action(?:.*):(.*)Action Input(?:.*):(.*)/gms.exec(text);
    if (!match) {
      logger.debug(`Could not find Action tool in: ${text}`);
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

  async call(data: IChatModelCallParams): Promise<{ content: string } & Record<string, any>> {
    const { input, options } = data;
    // const model = new ChatOpenAI({ temperature: options.temperature as number });
    const model = new AzureOpenAI({});
    // const memory = new ConversationSummaryMemory({
    //   memoryKey: 'chat_history',
    //   llm: model,
    // });
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
    searchTool.name = 'bing';
    const calcTool = new Calculator();
    const dalletool = new DallETool(process.env.AZ_DALLE_APIKEY, { userid: options?.user.id });
    calcTool.name = 'calculator';
    const filestore = new AzFileStore(`${options?.user.id}/store/${options?.sessionid}}`);
    const tools = [
      searchTool,
      calcTool,
      new UnitConvertorTool(),
      dalletool,
      //new WebBrowser({model: model as LLM}),
      new RequestsGetTool(),
      new RequestsPostTool(),
      // new AzReadFileTool({ store: filestore }),
      // new AzWriteFileTool({ store: filestore }),
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
    let intermediateSteps: AgentStep[] = [];
    const llmChain = new LLMChain({
      prompt: new CustomPromptTemplate({
        tools,
        //inputVariables: ['input', 'agent_scratchpad'],
        inputVariables: ['input', 'chat_history', 'agent_scratchpad'],
        setLastInput: (msg, isteps) => {
          lastIntermediateSet = msg;
          intermediateSteps = isteps;
        },
        currentUser: options?.user,
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

    const history = input
      .slice(1, -1)
      .map(i => i.role + ': ' + i.content) //system, human, ai, generic
      .join('\n\n');
    logger.debug('Using history:' + history);
    const summary =
      history.trim() === '' ? '' : await model._call(`summarize the following chat converstion between an user and ai assistant:\n\n${history}`, {});
    logger.debug('Summary: ' + summary);
    const inputMsg = input[input.length - 1].content;
    logger.debug(`Executing with input "${inputMsg}"...`);

    function unmaskname(input: string) {
      return input.replace(/maskedhumanname/g, `${options?.user?.first_name || 'user'}`);
    }

    try {
      const response = await executor.call({ input: inputMsg, chat_history: summary });

      logger.debug(`Got response`);

      logger.debug(JSON.stringify(response, null, 2));
      const result = {
        content: unmaskname(response.output) + (dalletool.images.length > 0 ? '\n\n ### Generated Images \n\n' + dalletool.images.join('\n') : ''),
        options: {
          intermediate_content: unmaskname(lastIntermediateSet),
          intermediateSteps,
          followup_questions: followupQuestions.map(unmaskname),
        },
      };

      return result;
    } catch (ex) {
      console.log(ex);
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
