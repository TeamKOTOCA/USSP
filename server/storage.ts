import { db, dbClient } from "./db";
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
  updateNamespace(id: number, ns: Partial<InsertNamespace>): Promise<Namespace | null>;
  deleteNamespace(id: number): Promise<void>;
  
  getClients(): Promise<OauthClient[]>;
  getClientByClientId(clientId: string): Promise<OauthClient | null>;
  ensureOAuthClient(clientSpace: string, redirectUri: string): Promise<OauthClient>;
  createClient(client: InsertOauthClient): Promise<OauthClient>;
  deleteClient(id: number): Promise<void>;

  ensureNamespaceForClient(clientSpace: string): Promise<Namespace>;
  
  getFiles(): Promise<FileMetadata[]>;
  
  getStats(): Promise<{ totalStorage: number, totalFiles: number, activeClients: number, activeAdapters: number, activeNamespaces: number }>;
}

export class DatabaseStorage implements IStorage {
  async getAdapters(): Promise<StorageAdapter[]> {
    const rows = await db.select().from(storageAdapters);
    if (dbClient !== "sqlite") {
      return rows;
    }

    return rows.map((row: any) => ({
      ...row,
      isDefault: Boolean(row.isDefault),
      config:
        typeof row.config === "string"
          ? (() => {
              try {
                return JSON.parse(row.config);
              } catch {
                return {};
              }
            })()
          : (row.config ?? {}),
    }));
  }
  
  async createAdapter(adapter: InsertStorageAdapter): Promise<StorageAdapter> {
    const values = {
      ...adapter,
      isDefault:
        adapter.isDefault === undefined
          ? undefined
          : ((adapter.isDefault ? 1 : 0) as any),
      config: dbClient === "sqlite" ? (typeof adapter.config === "string" ? adapter.config : JSON.stringify(adapter.config ?? {})) : adapter.config,
    } as any;

    const [created] = await db.insert(storageAdapters).values(values).returning();
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

  async updateNamespace(id: number, ns: Partial<InsertNamespace>): Promise<Namespace | null> {
    const [updated] = await db
      .update(namespaces)
      .set(ns)
      .where(eq(namespaces.id, id))
      .returning();

    return updated ?? null;
  }
  
  async deleteNamespace(id: number): Promise<void> {
    await db.delete(namespaces).where(eq(namespaces.id, id));
  }

  async getClients(): Promise<OauthClient[]> {
    return await db.select().from(oauthClients);
  }

  async getClientByClientId(clientId: string): Promise<OauthClient | null> {
    const [client] = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, clientId))
      .limit(1);

    return client ?? null;
  }

  async ensureOAuthClient(clientSpace: string, redirectUri: string): Promise<OauthClient> {
    const existing = await this.getClientByClientId(clientSpace);
    if (!existing) {
      const clientSecret = crypto.randomBytes(32).toString('hex');
      const [created] = await db
        .insert(oauthClients)
        .values({
          name: `OAuth ClientSpace ${clientSpace}`,
          clientId: clientSpace,
          clientSecret,
          redirectUris: redirectUri,
        })
        .returning();

      return created;
    }

    const redirectUris = existing.redirectUris
      .split(',')
      .map((uri) => uri.trim())
      .filter(Boolean);

    if (redirectUris.includes(redirectUri)) {
      return existing;
    }

    const updatedRedirectUris = [...redirectUris, redirectUri].join(',');
    const [updated] = await db
      .update(oauthClients)
      .set({ redirectUris: updatedRedirectUris })
      .where(eq(oauthClients.id, existing.id))
      .returning();

    return updated;
  }
  
  async createClient(client: InsertOauthClient): Promise<OauthClient> {
    const clientSecret = crypto.randomBytes(32).toString('hex');

    const [created] = await db.insert(oauthClients).values({
      ...client,
      clientSecret,
    }).returning();
    return created;
  }
  
  async deleteClient(id: number): Promise<void> {
    await db.delete(oauthClients).where(eq(oauthClients.id, id));
  }

  async ensureNamespaceForClient(clientSpace: string): Promise<Namespace> {
    const [existingNamespace] = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.name, clientSpace))
      .limit(1);

    if (existingNamespace) {
      return existingNamespace;
    }

    const [defaultAdapter] = await db
      .select()
      .from(storageAdapters)
      .where(eq(storageAdapters.isDefault, (dbClient === "sqlite" ? 1 : true) as any))
      .limit(1);

    const [created] = await db
      .insert(namespaces)
      .values({
        name: clientSpace,
        storageAdapterId: defaultAdapter?.id,
      })
      .returning();

    return created;
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
