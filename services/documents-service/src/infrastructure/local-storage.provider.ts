import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { AbstractStorageProvider } from "./storage.port";

@Injectable()
export class LocalStorageProvider extends AbstractStorageProvider {
  private readonly basePath: string;

  constructor() {
    super();
    this.basePath = process.env.DOCUMENT_STORAGE_PATH ?? "./uploads";
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const filePath = this.resolveFilePath(key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);
  }

  async getDownloadUrl(key: string): Promise<string> {
    return `/documents/download/${encodeURIComponent(key)}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getAbsolutePath(key: string): string {
    return this.resolveFilePath(key);
  }

  private resolveFilePath(key: string): string {
    return path.resolve(this.basePath, key);
  }
}
