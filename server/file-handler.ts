import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { Readable } from "stream";

export interface StorageAdapterConfig {
  type: "local" | "s3" | "gdrive";
  config: Record<string, any>;
}

export interface FileInfo {
  path: string;
  size: number;
  mimeType: string;
  etag: string;
}

export class FileHandler {
  async uploadFile(
    adapter: StorageAdapterConfig,
    filePath: string,
    data: Buffer | Readable
  ): Promise<FileInfo> {
    if (adapter.type === "local") {
      return this.uploadLocal(adapter.config, filePath, data);
    }
    // S3, GDrive等は後で実装
    throw new Error(`Adapter type '${adapter.type}' not yet implemented`);
  }

  private async uploadLocal(
    config: Record<string, any>,
    filePath: string,
    data: Buffer | Readable
  ): Promise<FileInfo> {
    const baseDir = config.path || path.join(process.cwd(), "data", "storage");
    const fullPath = path.join(baseDir, filePath);
    const dir = path.dirname(fullPath);

    // ディレクトリを作成
    await fs.mkdir(dir, { recursive: true });

    // ファイルを書き込み
    if (Buffer.isBuffer(data)) {
      await fs.writeFile(fullPath, data);
    } else {
      const stream = data;
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      await fs.writeFile(fullPath, Buffer.concat(chunks));
    }

    // ファイル情報を取得
    const stats = await fs.stat(fullPath);
    const buffer = await fs.readFile(fullPath);
    const etag = crypto
      .createHash("md5")
      .update(buffer)
      .digest("hex");

    // ファイルタイプ推定
    let mimeType = "application/octet-stream";
    if (filePath.endsWith(".json")) mimeType = "application/json";
    if (filePath.endsWith(".txt")) mimeType = "text/plain";
    if (filePath.endsWith(".csv")) mimeType = "text/csv";
    if (filePath.endsWith(".pdf")) mimeType = "application/pdf";
    if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg"))
      mimeType = "image/jpeg";
    if (filePath.endsWith(".png")) mimeType = "image/png";
    if (filePath.endsWith(".gif")) mimeType = "image/gif";

    return {
      path: filePath,
      size: stats.size,
      mimeType,
      etag,
    };
  }

  async downloadFile(
    adapter: StorageAdapterConfig,
    filePath: string
  ): Promise<Buffer | null> {
    if (adapter.type === "local") {
      return this.downloadLocal(adapter.config, filePath);
    }
    throw new Error(`Adapter type '${adapter.type}' not yet implemented`);
  }

  private async downloadLocal(
    config: Record<string, any>,
    filePath: string
  ): Promise<Buffer | null> {
    const baseDir = config.path || path.join(process.cwd(), "data", "storage");
    const fullPath = path.join(baseDir, filePath);

    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      return null;
    }
  }

  async deleteFile(
    adapter: StorageAdapterConfig,
    filePath: string
  ): Promise<boolean> {
    if (adapter.type === "local") {
      return this.deleteLocal(adapter.config, filePath);
    }
    throw new Error(`Adapter type '${adapter.type}' not yet implemented`);
  }

  private async deleteLocal(
    config: Record<string, any>,
    filePath: string
  ): Promise<boolean> {
    const baseDir = config.path || path.join(process.cwd(), "data", "storage");
    const fullPath = path.join(baseDir, filePath);

    try {
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getFileStats(
    adapter: StorageAdapterConfig,
    filePath: string
  ): Promise<FileInfo | null> {
    if (adapter.type === "local") {
      return this.getLocalStats(adapter.config, filePath);
    }
    throw new Error(`Adapter type '${adapter.type}' not yet implemented`);
  }

  private async getLocalStats(
    config: Record<string, any>,
    filePath: string
  ): Promise<FileInfo | null> {
    const baseDir = config.path || path.join(process.cwd(), "data", "storage");
    const fullPath = path.join(baseDir, filePath);

    try {
      const stats = await fs.stat(fullPath);
      const buffer = await fs.readFile(fullPath);
      const etag = crypto
        .createHash("md5")
        .update(buffer)
        .digest("hex");

      let mimeType = "application/octet-stream";
      if (filePath.endsWith(".json")) mimeType = "application/json";
      if (filePath.endsWith(".txt")) mimeType = "text/plain";

      return {
        path: filePath,
        size: stats.size,
        mimeType,
        etag,
      };
    } catch (error) {
      return null;
    }
  }
}

export const fileHandler = new FileHandler();
