import { logger } from '@/utils/logger';
import { BlobServiceClient } from '@azure/storage-blob';
import axios from 'axios';
import { Tool } from 'langchain/tools';
import crypto from 'crypto';

class DallETool extends Tool {
  name = 'DALL-E';

  description =
    'an image generation tool, useful for when you need to generate an image based on text description. input should be text describing the image. the output will be a generated image link in markdown format. If multiple images are required the input text describing the image should be on seperate lines.';

  key: string;

  params: Record<string, string>;

  images: string[] = [];

  constructor(
    apiKey: string | undefined = typeof process !== 'undefined'
      ? // eslint-disable-next-line no-process-env
        process.env?.AZ_DALLE_APIKEY
      : undefined,
    params: Record<string, string> = {},
  ) {
    super();

    if (!apiKey) {
      throw new Error('DALLE API key not set. You can set it as AZ_DALLE_APIKEY in your .env file.');
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

    const inputset = input
      .replace('```', '')
      .split('\n')
      .map(t => t.trim())
      .filter(t => t !== '');
    // logger.warn(inputset);

    const output: string[] = [];
    for await (const input of inputset) {
      const body = {
        caption: input,
        resolution: '256x256',
      };
      const apiUrl = new URL(process.env.AZ_DALLE_URL);
      //logger.debug('calling ' + apiUrl.href);
      try {
        let response = await axios({
          url: apiUrl.href,
          method: 'POST',
          data: JSON.stringify(body),
          headers,
        });

        if (response.status >= 400) {
          logger.warn(response);
          return "I don't know how to do that.";
        }

        let status = '';
        //console.log(response.headers);
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
        //return `![](${image_url})`;

        const AZURE_STORAGE_CONNECTION_STRING = process.env.AZCONNSTR;

        if (!AZURE_STORAGE_CONNECTION_STRING) {
          logger.error('Azure Storage Connection string not found');
        }

        // Create the BlobServiceClient object with connection string
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(process.env.AZUPLOADCONTAINER);

        const iurl = new URL(image_url);
        const name = iurl.pathname.split('/').pop();
        // Create a unique name for the blob
        const blobName = `${this.params['userid']}/images/${crypto.randomBytes(10).toString('hex')}.${name}`;
        // Get a block blob client
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        // Display blob name and url
        logger.info(`\nUploading image to Azure storage as blob\n\tname: ${blobName}:\n\tURL: ${blockBlobClient.url}`);

        // Upload data to the blob
        await blockBlobClient.syncUploadFromURL(image_url);
        logger.debug(`Blob was uploaded successfully.`);

        const rwurl = blockBlobClient.url.replace(process.env.AZUPLOADHOST, `${process.env.APIROOT}/api/data/file?n=`);
        blockBlobClient.setMetadata({
          prompt: input,
          sessionid: this.params.sessionid,
        });
        output.push(rwurl);
      } catch (ex) {
        console.error(ex);
        return "I don't know how to do that.";
      }
    }
    const results = output.map((u, i) => `![${inputset[i]}](${u})`);
    this.images.push(...results);
    return results.join('\n');
  }
}

export { DallETool };
