import { logger } from '@/utils/logger';
import axios from 'axios';
import { Tool } from 'langchain/tools';

class DallETool extends Tool {
  name = 'dalle';

  description =
    'a image generation tool. useful for when you need to generate an image based on text description. input should be a text describing the image.';

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
      'api-key': this.key,
      'Content-Type': 'application/json',
    };

    const body = {
      caption: input,
      resolution: '256x256',
    };
    const apiUrl = new URL(process.env.AZ_DALLE_URL);
    logger.debug('calling ' + apiUrl.href);
    try {
      let response = await axios({
        url: apiUrl.href,
        method: 'POST',
        data: JSON.stringify(body),
        headers,
      });

      if (response.status >= 400) {
        console.log(response);
        return "I don't know how to do that.";
      }

      let status = '';
      console.log(response.headers);
      const operation_location = response.headers['operation-location'];
      const retry_after = response.headers['retry-after'];
      while (status !== 'Succeeded') {
        logger.debug('waiting ' + retry_after + 'ms');
        await new Promise(resolve => setTimeout(resolve, parseInt(retry_after)));
        response = await axios.get(operation_location, { headers });
        status = response.data.status;
        logger.debug('waiting status ' + status);
      }
      const image_url = response.data.result.contentUrl;
      return `![](${image_url})`;
    } catch (ex) {
      console.error(ex);
      return "I don't know how to do that.";
    }
  }
}

export { DallETool };
