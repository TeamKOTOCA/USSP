import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const storageAdapters = pgTable("storage_adapters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["local", "s3", "gdrive"] }).notNull(),
  config: jsonb("config").notNull().default({}),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const namespaces = pgTable("namespaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  storageAdapterId: integer("storage_adapter_id").references(() => storageAdapters.id),
  quotaBytes: integer("quota_bytes"), // null means unlimited
  createdAt: timestamp("created_at").defaultNow(),
});

export const oauthClients = pgTable("oauth_clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret").notNull(),
  redirectUris: text("redirect_uris").notNull(), // comma separated
  createdAt: timestamp("created_at").defaultNow(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  namespaceId: integer("namespace_id").references(() => namespaces.id).notNull(),
  path: text("path").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  mimeType: text("mime_type").notNull(),
  etag: text("etag").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStorageAdapterSchema = createInsertSchema(storageAdapters).omit({ id: true, createdAt: true });
// For forms, config is often typed as a string then parsed to JSON, but we'll accept any object here
export const insertNamespaceSchema = createInsertSchema(namespaces).omit({ id: true, createdAt: true });
export const insertOauthClientSchema = createInsertSchema(oauthClients).omit({ id: true, clientId: true, clientSecret: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type StorageAdapter = typeof storageAdapters.$inferSelect;
export type Namespace = typeof namespaces.$inferSelect;
export type OauthClient = typeof oauthClients.$inferSelect;
export type FileMetadata = typeof files.$inferSelect;

export type InsertStorageAdapter = z.infer<typeof insertStorageAdapterSchema>;
export type InsertNamespace = z.infer<typeof insertNamespaceSchema>;
export type InsertOauthClient = z.infer<typeof insertOauthClientSchema>;
