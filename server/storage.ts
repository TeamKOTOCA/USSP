import { db } from "./db";
import { 
  storageAdapters, namespaces, oauthClients, files,
  type StorageAdapter, type Namespace, type OauthClient, type FileMetadata,
  type InsertStorageAdapter, type InsertNamespace, type InsertOauthClient
} from "@shared/schema";
import { eq, count, sum } from "drizzle-orm";
import crypto from "crypto";

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

  async getStats() {
    const [{ totalFiles }] = await db.select({ totalFiles: count() }).from(files);
    const [{ activeClients }] = await db.select({ activeClients: count() }).from(oauthClients);
    const [{ activeAdapters }] = await db.select({ activeAdapters: count() }).from(storageAdapters);
    const [{ activeNamespaces }] = await db.select({ activeNamespaces: count() }).from(namespaces);
    const [{ totalStorageBytes }] = await db
      .select({ totalStorageBytes: sum(files.sizeBytes) })
      .from(files);

    const toSafeNumber = (value: unknown): number => {
      const parsed = Number(value ?? 0);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return {
      totalStorage: toSafeNumber(totalStorageBytes),
      totalFiles: toSafeNumber(totalFiles),
      activeClients: toSafeNumber(activeClients),
      activeAdapters: toSafeNumber(activeAdapters),
      activeNamespaces: toSafeNumber(activeNamespaces),
    };
  }
}

export const storage = new DatabaseStorage();
