import { db } from "./db";
import { 
  storageAdapters, namespaces, oauthClients, files,
  type StorageAdapter, type Namespace, type OauthClient, type FileMetadata,
  type InsertStorageAdapter, type InsertNamespace, type InsertOauthClient
} from "@shared/schema";
import { eq, count } from "drizzle-orm";
import crypto from "crypto";
import { getAdapter } from "./adapters/index";

export interface IStorage {
  getAdapters(): Promise<StorageAdapter[]>;
  createAdapter(adapter: InsertStorageAdapter): Promise<StorageAdapter>;
  deleteAdapter(id: number): Promise<void>;
  
  getNamespaces(): Promise<Namespace[]>;
  createNamespace(ns: InsertNamespace): Promise<Namespace>;
  deleteNamespace(id: number): Promise<void>;
  
  getClients(): Promise<OauthClient[]>;
  createClient(client: InsertOauthClient): Promise<OauthClient>;
  deleteClient(id: number): Promise<void>;
  
  getFiles(): Promise<FileMetadata[]>;
  uploadFile(namespaceId: number, fileName: string, buffer: Buffer, mimeType: string): Promise<FileMetadata>;
  downloadFile(namespaceId: number, fileName: string): Promise<Buffer>;
  deleteFile(id: number): Promise<void>;
  
  getStats(): Promise<{ totalStorage: number, totalFiles: number, activeClients: number, activeAdapters: number, activeNamespaces: number }>;
}

export class DatabaseStorage implements IStorage {
  async getAdapters(): Promise<StorageAdapter[]> {
    return await db.select().from(storageAdapters);
  }
  
  async createAdapter(adapter: InsertStorageAdapter): Promise<StorageAdapter> {
    const [created] = await db.insert(storageAdapters).values(adapter).returning();
    return created;
  }
  
  async deleteAdapter(id: number): Promise<void> {
    await db.delete(storageAdapters).where(eq(storageAdapters.id, id));
  }

  async getNamespaces(): Promise<Namespace[]> {
    return await db.select().from(namespaces);
  }
  
  async createNamespace(ns: InsertNamespace): Promise<Namespace> {
    const [created] = await db.insert(namespaces).values(ns).returning();
    return created;
  }
  
  async deleteNamespace(id: number): Promise<void> {
    await db.delete(namespaces).where(eq(namespaces.id, id));
  }

  async getClients(): Promise<OauthClient[]> {
    return await db.select().from(oauthClients);
  }
  
  async createClient(client: InsertOauthClient): Promise<OauthClient> {
    const clientId = crypto.randomBytes(16).toString('hex');
    const clientSecret = crypto.randomBytes(32).toString('hex');
    
    const [created] = await db.insert(oauthClients).values({
      ...client,
      clientId,
      clientSecret,
    }).returning();
    return created;
  }
  
  async deleteClient(id: number): Promise<void> {
    await db.delete(oauthClients).where(eq(oauthClients.id, id));
  }

  async getFiles(): Promise<FileMetadata[]> {
    return await db.select().from(files).limit(100);
  }

  async uploadFile(
    namespaceId: number,
    fileName: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<FileMetadata> {
    // Get namespace to find storage adapter
    const [ns] = await db.select().from(namespaces).where(eq(namespaces.id, namespaceId));
    if (!ns) {
      throw new Error("Namespace not found");
    }

    // Get storage adapter
    const [adapter] = await db.select().from(storageAdapters).where(eq(storageAdapters.id, ns.storageAdapterId));
    if (!adapter) {
      throw new Error("Storage adapter not found");
    }

    // Upload file using adapter
    const adapterInstance = getAdapter(adapter);
    const filePath = await adapterInstance.upload(String(namespaceId), fileName, buffer);

    // Calculate etag (SHA256 hash of file content)
    const etag = crypto.createHash("sha256").update(buffer).digest("hex");

    // Store file metadata in database
    const [fileMetadata] = await db.insert(files).values({
      namespaceId,
      path: filePath,
      sizeBytes: buffer.length,
      mimeType,
      etag,
    }).returning();

    return fileMetadata;
  }

  async downloadFile(namespaceId: number, fileName: string): Promise<Buffer> {
    // Get namespace to find storage adapter
    const [ns] = await db.select().from(namespaces).where(eq(namespaces.id, namespaceId));
    if (!ns) {
      throw new Error("Namespace not found");
    }

    // Get storage adapter
    const [adapter] = await db.select().from(storageAdapters).where(eq(storageAdapters.id, ns.storageAdapterId));
    if (!adapter) {
      throw new Error("Storage adapter not found");
    }

    // Download file using adapter
    const adapterInstance = getAdapter(adapter);
    const buffer = await adapterInstance.download(String(namespaceId), fileName);

    return buffer;
  }

  async deleteFile(id: number): Promise<void> {
    // Get file metadata
    const [file] = await db.select().from(files).where(eq(files.id, id));
    if (!file) {
      throw new Error("File not found");
    }

    // Get namespace to find storage adapter
    const [ns] = await db.select().from(namespaces).where(eq(namespaces.id, file.namespaceId));
    if (!ns) {
      throw new Error("Namespace not found");
    }

    // Get storage adapter
    const [adapter] = await db.select().from(storageAdapters).where(eq(storageAdapters.id, ns.storageAdapterId));
    if (!adapter) {
      throw new Error("Storage adapter not found");
    }

    // Delete file from storage using adapter
    const adapterInstance = getAdapter(adapter);
    const fileName = file.path.split("/").pop() || "";
    await adapterInstance.delete(String(file.namespaceId), fileName);

    // Delete file metadata from database
    await db.delete(files).where(eq(files.id, id));
  }

  async getStats() {
    const [{ totalFiles }] = await db.select({ totalFiles: count() }).from(files);
    const [{ activeClients }] = await db.select({ activeClients: count() }).from(oauthClients);
    const [{ activeAdapters }] = await db.select({ activeAdapters: count() }).from(storageAdapters);
    const [{ activeNamespaces }] = await db.select({ activeNamespaces: count() }).from(namespaces);
    
    const totalStorage = 0; // stub
    
    return {
      totalStorage,
      totalFiles,
      activeClients,
      activeAdapters,
      activeNamespaces,
    };
  }
}

export const storage = new DatabaseStorage();
