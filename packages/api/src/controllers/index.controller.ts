import { logger } from '@/utils/logger';
import { BlobServiceClient } from '@azure/storage-blob';
import { Controller, Get, QueryParam, Res } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

@Controller()
export class IndexController {
  @Get('/')
  index() {
    return 'OK';
  }

  @Get('/data')
  @OpenAPI({ summary: 'Return the generated files by name' })
  async getFile(@QueryParam('n') name: string, @Res() res) {
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZCONNSTR;

    if (!AZURE_STORAGE_CONNECTION_STRING) {
      logger.error('Azure Storage Connection string not found');
    }

    // Create the BlobServiceClient object with connection string
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZUPLOADCONTAINER);

    // Create a unique name for the blob
    const blobName = `${name}`;

    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Display blob name and url
    logger.info(`downloading to Azure storage as blob\n\tname: ${blobName}:\n\tURL: ${blockBlobClient.url}`);
    const buffer = await blockBlobClient.downloadToBuffer();

    res.setHeader('Content-Type', 'image/png');
    return res.send(buffer);
    //res.sendFile(name, { root: './data' });
  }
}
