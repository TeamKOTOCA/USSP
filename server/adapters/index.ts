import type { StorageAdapter } from "@shared/schema";
import { LocalAdapter } from "./local";
import { S3Adapter } from "./s3";
import { GoogleDriveAdapter } from "./gdrive";

export interface IStorageAdapter {
  /**
   * Upload a file to storage
   * @param namespaceId The namespace ID
   * @param fileName The file name
   * @param buffer The file buffer
   * @returns The file path or key in storage
   */
  upload(namespaceId: string, fileName: string, buffer: Buffer): Promise<string>;

  /**
   * Download a file from storage
   * @param namespaceId The namespace ID
   * @param fileName The file name
   * @returns The file buffer
   */
  download(namespaceId: string, fileName: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   * @param namespaceId The namespace ID
   * @param fileName The file name
   */
  delete(namespaceId: string, fileName: string): Promise<void>;

  /**
   * Check if a file exists in storage
   * @param namespaceId The namespace ID
   * @param fileName The file name
   */
  exists(namespaceId: string, fileName: string): Promise<boolean>;
}

export function getAdapter(
  adapter: StorageAdapter
): IStorageAdapter {
  switch (adapter.type) {
    case "local":
      return new LocalAdapter(adapter.config as Record<string, any>);
    case "s3":
      return new S3Adapter(adapter.config as Record<string, any>);
    case "gdrive":
      return new GoogleDriveAdapter(adapter.config as Record<string, any>);
    default:
      throw new Error(`Unknown adapter type: ${adapter.type}`);
  }
}

export { LocalAdapter, S3Adapter, GoogleDriveAdapter };
