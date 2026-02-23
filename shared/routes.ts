import { z } from 'zod';
import { insertStorageAdapterSchema, insertNamespaceSchema, insertOauthClientSchema, storageAdapters, namespaces, oauthClients, files } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  adapters: {
    list: {
      method: 'GET' as const,
      path: '/api/adapters' as const,
      responses: { 200: z.array(z.custom<typeof storageAdapters.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/adapters' as const,
      input: insertStorageAdapterSchema,
      responses: { 201: z.custom<typeof storageAdapters.$inferSelect>(), 400: errorSchemas.validation },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/adapters/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    }
  },
  namespaces: {
    list: {
      method: 'GET' as const,
      path: '/api/namespaces' as const,
      responses: { 200: z.array(z.custom<typeof namespaces.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/namespaces' as const,
      input: insertNamespaceSchema,
      responses: { 201: z.custom<typeof namespaces.$inferSelect>(), 400: errorSchemas.validation },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/namespaces/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    }
  },
  clients: {
    list: {
      method: 'GET' as const,
      path: '/api/clients' as const,
      responses: { 200: z.array(z.custom<typeof oauthClients.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/clients' as const,
      input: insertOauthClientSchema,
      responses: { 201: z.custom<typeof oauthClients.$inferSelect>(), 400: errorSchemas.validation },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/clients/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    }
  },
  files: {
    list: {
      method: 'GET' as const,
      path: '/api/files' as const,
      responses: { 200: z.array(z.custom<typeof files.$inferSelect>()) },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/files/upload' as const,
      input: z.object({
        namespaceId: z.number(),
        fileName: z.string(),
        mimeType: z.string(),
        // Note: file buffer is sent as multipart form data
      }),
      responses: { 201: z.custom<typeof files.$inferSelect>(), 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    download: {
      method: 'GET' as const,
      path: '/api/files/download/:namespaceId/:fileName' as const,
      responses: { 200: z.custom<Buffer>(), 404: errorSchemas.notFound },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/files/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    }
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats' as const,
      responses: {
        200: z.object({
          totalStorage: z.number(),
          totalFiles: z.number(),
          activeClients: z.number(),
          activeAdapters: z.number(),
          activeNamespaces: z.number(),
        })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
