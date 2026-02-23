import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { Readable } from "stream";
import { S3Adapter, type S3AdapterConfig } from "./adapters/s3-adapter";
import { GoogleDriveAdapter, type GoogleDriveConfig } from "./adapters/gdrive-adapter";

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
    data: Buffer | Readable,
    mimeType?: string
  ): Promise<FileInfo> {
    if (adapter.type === "local") {
      return this.uploadLocal(adapter.config, filePath, data, mimeType);
    }
    if (adapter.type === "s3") {
      const s3 = new S3Adapter(adapter.config as S3AdapterConfig);
      return s3.uploadFile(filePath, data, mimeType);
    }
    if (adapter.type === "gdrive") {
      const gdrive = new GoogleDriveAdapter(adapter.config as GoogleDriveConfig);
      return gdrive.uploadFile(filePath, data, mimeType);
    }
    throw new Error(`Adapter type '${adapter.type}' not yet implemented`);
  }

  private async uploadLocal(
    config: Record<string, any>,
    filePath: string,
    data: Buffer | Readable,
    mimeType?: string
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
    if (!mimeType) {
      mimeType = "application/octet-stream";
      if (filePath.endsWith(".json")) mimeType = "application/json";
      if (filePath.endsWith(".txt")) mimeType = "text/plain";
      if (filePath.endsWith(".csv")) mimeType = "text/csv";
      if (filePath.endsWith(".pdf")) mimeType = "application/pdf";
      if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg"))
        mimeType = "image/jpeg";
      if (filePath.endsWith(".png")) mimeType = "image/png";
      if (filePath.endsWith(".gif")) mimeType = "image/gif";
    }

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
    if (adapter.type === "s3") {
      const s3 = new S3Adapter(adapter.config as S3AdapterConfig);
      return s3.downloadFile(filePath);
    }
    if (adapter.type === "gdrive") {
      const gdrive = new GoogleDriveAdapter(adapter.config as GoogleDriveConfig);
      return gdrive.downloadFile(filePath);
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
    if (adapter.type === "s3") {
      const s3 = new S3Adapter(adapter.config as S3AdapterConfig);
      return s3.deleteFile(filePath);
    }
    if (adapter.type === "gdrive") {
      const gdrive = new GoogleDriveAdapter(adapter.config as GoogleDriveConfig);
      return gdrive.deleteFile(filePath);
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
    if (adapter.type === "s3") {
      const s3 = new S3Adapter(adapter.config as S3AdapterConfig);
      return s3.getFileStats(filePath);
    }
    if (adapter.type === "gdrive") {
      const gdrive = new GoogleDriveAdapter(adapter.config as GoogleDriveConfig);
      return gdrive.getFileStats(filePath);
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
