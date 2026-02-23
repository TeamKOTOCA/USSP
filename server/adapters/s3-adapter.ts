import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { Readable } from "stream";

export interface S3AdapterConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string; // MinIO/R2用
  forcePathStyle?: boolean; // MinIO用
}

export interface FileInfo {
  path: string;
  size: number;
  mimeType: string;
  etag: string;
}

export class S3Adapter {
  private client: S3Client;
  private config: S3AdapterConfig;

  constructor(config: S3AdapterConfig) {
    this.config = config;

    const clientConfig: any = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    // MinIOやR2などエンドポイントカスタム設定
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      if (config.forcePathStyle !== undefined) {
        clientConfig.forcePathStyle = config.forcePathStyle;
      }
    }

    this.client = new S3Client(clientConfig);
  }

  async uploadFile(
    filePath: string,
    data: Buffer | Readable,
    mimeType?: string
  ): Promise<FileInfo> {
    let buffer: Buffer;

    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else {
      const chunks = [];
      for await (const chunk of data) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
    }

    const etag = crypto.createHash("md5").update(buffer).digest("hex");

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: filePath,
          Body: buffer,
          ContentType: mimeType || "application/octet-stream",
          Metadata: {
            etag,
          },
        })
      );

      return {
        path: filePath,
        size: buffer.length,
        mimeType: mimeType || "application/octet-stream",
        etag,
      };
    } catch (error) {
      console.error("[S3] Upload failed:", error);
      throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async downloadFile(filePath: string): Promise<Buffer | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: filePath,
        })
      );

      if (!response.Body) {
        return null;
      }

      // response.Body is Readable stream
      const chunks = [];
      for await (const chunk of response.Body as AsyncIterable<any>) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      if ((error as any).name === "NoSuchKey") {
        return null;
      }
      console.error("[S3] Download failed:", error);
      throw new Error(`S3 download failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: filePath,
        })
      );
      return true;
    } catch (error) {
      console.error("[S3] Delete failed:", error);
      return false;
    }
  }

  async getFileStats(filePath: string): Promise<FileInfo | null> {
    try {
      const response: HeadObjectCommandOutput = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: filePath,
        })
      );

      return {
        path: filePath,
        size: response.ContentLength || 0,
        mimeType: response.ContentType || "application/octet-stream",
        etag: response.ETag?.replace(/"/g, "") || "",
      };
    } catch (error) {
      if ((error as any).name === "NotFound") {
        return null;
      }
      console.error("[S3] GetStats failed:", error);
      return null;
    }
  }

  async getSignedDownloadUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const url = await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: filePath,
        }),
        { expiresIn }
      );
      return url;
    } catch (error) {
      console.error("[S3] GetSignedUrl failed:", error);
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async listFiles(prefix: string = ""): Promise<string[]> {
    try {
      const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: prefix,
        })
      );

      return (response.Contents || []).map((obj) => obj.Key || "");
    } catch (error) {
      console.error("[S3] ListFiles failed:", error);
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: ".ussp-test-connection",
        })
      );
      return true;
    } catch (error) {
      // ファイルが存在しなくても接続確認成功
      if ((error as any).name === "NotFound") {
        return true;
      }
      console.error("[S3] Connection test failed:", error);
      return false;
    }
  }
}
