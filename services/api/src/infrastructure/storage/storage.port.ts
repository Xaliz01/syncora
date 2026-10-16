export abstract class AbstractStorageProvider {
  abstract upload(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  abstract getDownloadUrl(key: string): Promise<string>;
  abstract delete(key: string): Promise<void>;
}
