import type { IStorageAdapter } from "./index";

/**
 * Google Drive Storage Adapter
 * TODO: Implement using Google Drive API
 */
export class GoogleDriveAdapter implements IStorageAdapter {
  constructor(config: Record<string, any>) {
    // TODO: Initialize Google Drive client with config
  }

  async upload(
    namespaceId: string,
    fileName: string,
    buffer: Buffer
  ): Promise<string> {
    throw new Error("Google Drive adapter not yet implemented");
  }

  async download(
    namespaceId: string,
    fileName: string
  ): Promise<Buffer> {
    throw new Error("Google Drive adapter not yet implemented");
  }

  async delete(namespaceId: string, fileName: string): Promise<void> {
    throw new Error("Google Drive adapter not yet implemented");
  }

  async exists(namespaceId: string, fileName: string): Promise<boolean> {
    throw new Error("Google Drive adapter not yet implemented");
  }
}
