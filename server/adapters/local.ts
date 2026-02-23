import { promises as fs } from "fs";
import path from "path";
import type { IStorageAdapter } from "./index";

export class LocalAdapter implements IStorageAdapter {
  private baseDir: string;

  constructor(config: Record<string, any>) {
    this.baseDir = config.basePath || process.cwd() + "/storage";
  }

  private getSafePath(namespaceId: string, fileName: string): string {
    // Sanitize fileName to prevent directory traversal attacks
    const sanitized = fileName.replace(/\.\./g, "").replace(/[\/\\]/g, "_");
    if (!sanitized || sanitized === "" || sanitized.startsWith(".")) {
      throw new Error("Invalid file name");
    }

    const filePath = path.join(this.baseDir, String(namespaceId), sanitized);
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(this.baseDir);

    // Ensure the file path is within the base directory
    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error("File path outside base directory");
    }

    return resolvedPath;
  }

  async upload(
    namespaceId: string,
    fileName: string,
    buffer: Buffer
  ): Promise<string> {
    const filePath = this.getSafePath(namespaceId, fileName);
    const dirPath = path.dirname(filePath);

    try {
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, buffer);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  async download(
    namespaceId: string,
    fileName: string
  ): Promise<Buffer> {
    const filePath = this.getSafePath(namespaceId, fileName);

    try {
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        throw new Error("File not found");
      }
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  async delete(namespaceId: string, fileName: string): Promise<void> {
    const filePath = this.getSafePath(namespaceId, fileName);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        throw new Error("File not found");
      }
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  async exists(namespaceId: string, fileName: string): Promise<boolean> {
    const filePath = this.getSafePath(namespaceId, fileName);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
