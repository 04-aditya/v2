import { z } from 'zod';
import { BaseFileStore } from 'langchain/schema';
import { StructuredTool, ToolParams } from 'langchain/tools';

export class AzFileStore extends BaseFileStore {
  private readonly rootdir: string;
  private files: Map<string, string> = new Map();

  constructor(rootdir: string) {
    super();
    this.rootdir = rootdir;
  }

  async readFile(path: string): Promise<string> {
    const contents = this.files.get(path);
    if (contents === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return contents;
  }

  async writeFile(path: string, contents: string): Promise<void> {
    this.files.set(path, contents);
  }
}

interface AzReadFileParams extends ToolParams {
  store: AzFileStore;
}

export class AzReadFileTool extends StructuredTool {
  schema = z.object({
    file_path: z.string().describe('name of file'),
  });

  name = 'read_file';

  description = 'Read file from disk';

  store: BaseFileStore;

  constructor({ store, ...rest }: AzReadFileParams) {
    super(rest);

    this.store = store;
  }

  async _call({ file_path }: z.infer<typeof this.schema>) {
    return await this.store.readFile(file_path);
  }
}

interface AzWriteFileParams extends ToolParams {
  store: AzFileStore;
}

export class AzWriteFileTool extends StructuredTool {
  schema = z.object({
    file_path: z.string().describe('name of file'),
    text: z.string().describe('text to write to file'),
  });

  name = 'write_file';

  description = 'Write file from disk';

  store: BaseFileStore;

  constructor({ store, ...rest }: AzWriteFileParams) {
    super(rest);

    this.store = store;
  }

  async _call({ file_path, text }: z.infer<typeof this.schema>) {
    await this.store.writeFile(file_path, text);
    return 'File written to successfully.';
  }
}
