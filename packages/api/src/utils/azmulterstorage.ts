import multer from 'multer';
import { MulterAzureStorage, MASNameResolver, MASObjectResolver } from 'multer-azure-blob-storage';

const resolveBlobName: MASNameResolver = (req: any, file: Express.Multer.File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const blobName: string = file.filename; //yourCustomLogic(req, file);
    resolve(blobName);
  });
};

export type MetadataObj = { [k: string]: string };
const resolveMetadata: MASObjectResolver = (req: any, file: Express.Multer.File): Promise<MetadataObj> => {
  return new Promise<MetadataObj>((resolve, reject) => {
    const metadata: MetadataObj = {}; //yourCustomLogic(req, file);
    resolve(metadata);
  });
};

const resolveContentSettings: MASObjectResolver = (req: any, file: Express.Multer.File): Promise<MetadataObj> => {
  return new Promise<MetadataObj>((resolve, reject) => {
    const contentSettings: MetadataObj = {}; //yourCustomLogic(req, file);
    resolve(contentSettings);
  });
};

export const azureStorage: MulterAzureStorage = new MulterAzureStorage({
  connectionString: process.env.AZCONNSTR,
  accessKey: process.env.AZACCESSKEY,
  accountName: process.env.AZSTORAGE_ACCOUNT_NAME,
  containerName: process.env.AZUPLOADCONTAINER,
  blobName: resolveBlobName,
  metadata: resolveMetadata,
  contentSettings: resolveContentSettings,
  containerAccessLevel: 'blob',
  urlExpirationTime: 60,
});
