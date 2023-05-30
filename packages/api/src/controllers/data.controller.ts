import { UserEntity } from '@/entities/user.entity';
import authMiddleware from '@/middlewares/auth.middleware';
import { logger } from '@/utils/logger';
import { BlobServiceClient } from '@azure/storage-blob';
import { Authorized, Controller, CurrentUser, Delete, Get, HttpError, QueryParam, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { Http } from 'winston/lib/winston/transports';

@Controller('/api/data')
export class DataController {
  @Get('/file')
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
    logger.debug(`downloading to Azure storage as blob\n\tname: ${blobName}:\n\tURL: ${blockBlobClient.url}`);
    // const buffer = await blockBlobClient.downloadToBuffer();

    // const props = await blockBlobClient.getProperties();
    // //console.log(props);
    // res.setHeader('Content-Type', props.contentType);
    // res.setHeader('etag', props.etag);
    // res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    // return res.send(buffer);
    const downloadResponse = await blockBlobClient.download();
    res.setHeader('Content-Type', downloadResponse.contentType);
    res.setHeader('etag', downloadResponse.etag);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    downloadResponse.readableStreamBody.pipe(res);
    return res;
  }

  @Delete('/file')
  @OpenAPI({ summary: 'Delete a file by name' })
  @UseBefore(authMiddleware)
  async deleteFile(@QueryParam('n') name: string, @CurrentUser() user: UserEntity) {
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZCONNSTR;

    if (!AZURE_STORAGE_CONNECTION_STRING) {
      logger.error('Azure Storage Connection string not found');
    }

    // Create the BlobServiceClient object with connection string
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZUPLOADCONTAINER);

    if (name.startsWith(`${user.id}/`) === false) {
      throw new HttpError(403, 'Unauthorized');
    }
    // Create a unique name for the blob
    const blobName = `${name}`;

    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Display blob name and url
    logger.debug(`Deleting file from Azure storage as blob\n\tname: ${blobName}:\n\tURL: ${blockBlobClient.url}`);

    blockBlobClient.delete();
    return 'ok';
  }
}
