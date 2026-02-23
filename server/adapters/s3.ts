import type { IStorageAdapter } from "./index";

/**
 * AWS S3 Storage Adapter
 * TODO: Implement using AWS SDK v3
 */
export class S3Adapter implements IStorageAdapter {
  constructor(config: Record<string, any>) {
    // TODO: Initialize S3 client with config
  }

  async upload(
    namespaceId: string,
    fileName: string,
    buffer: Buffer
  ): Promise<string> {
    throw new Error("S3 adapter not yet implemented");
  }

  async download(
    namespaceId: string,
    fileName: string
  ): Promise<Buffer> {
    throw new Error("S3 adapter not yet implemented");
  }

  async delete(namespaceId: string, fileName: string): Promise<void> {
    throw new Error("S3 adapter not yet implemented");
  }

  async exists(namespaceId: string, fileName: string): Promise<boolean> {
    throw new Error("S3 adapter not yet implemented");
  }
}
