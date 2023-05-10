import axios from 'axios';
import { Tool } from 'langchain/tools';

class BingAPI extends Tool {
  name = 'bing';

  description =
    `a search engine. useful for when you need to answer questions about current events.` +
    `input should be a search query. When arriving at the final or likely answer, make sure to cite results using [[number](URL)] notation after the reference.` +
    `If the provided search results refer to multiple subjects with the same name, write separate answers for each subject.`;

  key: string;

  params: Record<string, string>;

  constructor(
    apiKey: string | undefined = typeof process !== 'undefined'
      ? // eslint-disable-next-line no-process-env
        process.env?.BingApiKey
      : undefined,
    params: Record<string, string> = {},
  ) {
    super();

    if (!apiKey) {
      throw new Error('BingSerpAPI API key not set. You can set it as BingApiKey in your .env file.');
    }

    this.key = apiKey;
    this.params = params;
  }

  /** @ignore */
  async _call(input: string): Promise<string> {
    const headers = {
      'Ocp-Apim-Subscription-Key': this.key,
      accept: 'application/json',
    };
    const params = { ...this.params, q: input, textDecorations: 'true', textFormat: 'HTML' };
    const searchUrl = new URL('https://api.bing.microsoft.com/v7.0/search');

    Object.entries(params).forEach(([key, value]) => {
      searchUrl.searchParams.append(key, value);
    });

    const response = await axios.get(searchUrl.href, { headers });

    if (response.status !== 200) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const res = await response.data;
    const results: [] = res.webPages.value;

    if (results.length === 0) {
      return 'No good results found.';
    }
    //[{id, name, url, displayUrl, snippet, dateLastCrawled, language, isNavigational, isFamilyFriendly}]
    const snippets = results
      .map((result: { snippet: string; url: string; name: string }, idx: number) => `[${idx}]"${result.snippet}"\nURL: ${result.url}`)
      .join('\n\n');

    return snippets;
  }
}

export { BingAPI };
