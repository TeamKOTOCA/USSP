import { sql } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: text("role", { enum: ["admin", "user"] }).default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  lastLogin: timestamp("last_login"),
});

export const storageAdapters = pgTable("storage_adapters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["local", "s3", "gdrive"] }).notNull(),
  config: jsonb("config").notNull().default({}),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const namespaces = pgTable("namespaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  storageAdapterId: integer("storage_adapter_id").references(() => storageAdapters.id),
  quotaBytes: integer("quota_bytes"), // null means unlimited
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const oauthClients = pgTable("oauth_clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret").notNull(),
  redirectUris: text("redirect_uris").notNull(), // comma separated
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  namespaceId: integer("namespace_id").references(() => namespaces.id).notNull(),
  path: text("path").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  mimeType: text("mime_type").notNull(),
  etag: text("etag").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull(),
  code: text("code").unique(),
  accessToken: text("access_token").unique(),
  refreshToken: text("refresh_token").unique(),
  codeChallenge: text("code_challenge"),
  codeChallengeMethod: text("code_challenge_method"),
  redirectUri: text("redirect_uri"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const backupQueue = pgTable("backup_queue", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => files.id).notNull(),
  sourceAdapterId: integer("source_adapter_id").references(() => storageAdapters.id).notNull(),
  targetAdapterId: integer("target_adapter_id").references(() => storageAdapters.id).notNull(),
  status: text("status", { enum: ["pending", "in_progress", "completed", "failed"] }).default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  completedAt: timestamp("completed_at"),
});

export const insertStorageAdapterSchema = createInsertSchema(storageAdapters).omit({ id: true, createdAt: true });
// For forms, config is often typed as a string then parsed to JSON, but we'll accept any object here
export const insertNamespaceSchema = createInsertSchema(namespaces).omit({ id: true, createdAt: true });
export const insertOauthClientSchema = createInsertSchema(oauthClients).omit({ id: true, clientSecret: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type StorageAdapter = typeof storageAdapters.$inferSelect;
export type Namespace = typeof namespaces.$inferSelect;
export type OauthClient = typeof oauthClients.$inferSelect;
export type FileMetadata = typeof files.$inferSelect;
export type OAuthToken = typeof oauthTokens.$inferSelect;
export type BackupQueueItem = typeof backupQueue.$inferSelect;

export type InsertStorageAdapter = z.infer<typeof insertStorageAdapterSchema>;
export type InsertNamespace = z.infer<typeof insertNamespaceSchema>;
export type InsertOauthClient = z.infer<typeof insertOauthClientSchema>;
