import { google } from "googleapis";
import crypto from "crypto";
import { Readable } from "stream";

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId: string; // GDriveの保存先フォルダID
}

export interface FileInfo {
  path: string;
  size: number;
  mimeType: string;
  etag: string;
}

export class GoogleDriveAdapter {
  private drive: any;
  private config: GoogleDriveConfig;

  constructor(config: GoogleDriveConfig) {
    this.config = config;

    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: config.refreshToken,
    });

    this.drive = google.drive({ version: "v3", auth: oauth2Client });
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
    const fileName = filePath.split("/").pop() || filePath;

    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: mimeType || "application/octet-stream",
          properties: {
            path: filePath,
            etag: etag,
          },
          parents: [this.config.folderId],
        },
        media: {
          mimeType: mimeType || "application/octet-stream",
          body: Readable.from(buffer),
        },
      });

      return {
        path: filePath,
        size: buffer.length,
        mimeType: mimeType || "application/octet-stream",
        etag,
      };
    } catch (error) {
      console.error("[GoogleDrive] Upload failed:", error);
      throw new Error(
        `Google Drive upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async downloadFile(filePath: string): Promise<Buffer | null> {
    try {
      const fileName = filePath.split("/").pop() || filePath;

      // ファイルを検索
      const fileList = await this.drive.files.list({
        q: `name='${fileName}' and trashed=false`,
        spaces: "drive",
        fields: "files(id, name)",
        pageSize: 1,
      });

      if (!fileList.data.files || fileList.data.files.length === 0) {
        return null;
      }

      const fileId = fileList.data.files[0].id;

      // ファイルをダウンロード
      const response = await this.drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error("[GoogleDrive] Download failed:", error);
      return null;
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fileName = filePath.split("/").pop() || filePath;

      // ファイルを検索
      const fileList = await this.drive.files.list({
        q: `name='${fileName}' and trashed=false`,
        spaces: "drive",
        fields: "files(id)",
        pageSize: 1,
      });

      if (!fileList.data.files || fileList.data.files.length === 0) {
        return false;
      }

      const fileId = fileList.data.files[0].id;

      // ファイルをゴミ箱に移動
      await this.drive.files.update({
        fileId,
        requestBody: { trashed: true },
      });

      return true;
    } catch (error) {
      console.error("[GoogleDrive] Delete failed:", error);
      return false;
    }
  }

  async getFileStats(filePath: string): Promise<FileInfo | null> {
    try {
      const fileName = filePath.split("/").pop() || filePath;

      // ファイルを検索
      const fileList = await this.drive.files.list({
        q: `name='${fileName}' and trashed=false`,
        spaces: "drive",
        fields: "files(id, size, mimeType)",
        pageSize: 1,
      });

      if (!fileList.data.files || fileList.data.files.length === 0) {
        return null;
      }

      const file = fileList.data.files[0];

      return {
        path: filePath,
        size: parseInt(file.size || "0"),
        mimeType: file.mimeType || "application/octet-stream",
        etag: file.id || "",
      };
    } catch (error) {
      console.error("[GoogleDrive] GetStats failed:", error);
      return null;
    }
  }

  async getShareLink(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const fileName = filePath.split("/").pop() || filePath;

      // ファイルを検索
      const fileList = await this.drive.files.list({
        q: `name='${fileName}' and trashed=false`,
        spaces: "drive",
        fields: "files(id)",
        pageSize: 1,
      });

      if (!fileList.data.files || fileList.data.files.length === 0) {
        return null;
      }

      const fileId = fileList.data.files[0].id;

      // 共有権限を作成
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      // 共有リンクを生成
      return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    } catch (error) {
      console.error("[GoogleDrive] GetShareLink failed:", error);
      return null;
    }
  }

  async listFiles(prefix: string = ""): Promise<string[]> {
    try {
      const fileList = await this.drive.files.list({
        q: `trashed=false`,
        spaces: "drive",
        fields: "files(name)",
        pageSize: 100,
      });

      return (fileList.data.files || []).map((file: any) => file.name);
    } catch (error) {
      console.error("[GoogleDrive] ListFiles failed:", error);
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.drive.files.list({
        spaces: "drive",
        pageSize: 1,
        fields: "files(id)",
      });
      return true;
    } catch (error) {
      console.error("[GoogleDrive] Connection test failed:", error);
      return false;
    }
  }
}
