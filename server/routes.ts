import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import Busboy from "busboy";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Adapters
  app.get(api.adapters.list.path, async (req, res) => {
    const adapters = await storage.getAdapters();
    res.json(adapters);
  });

  app.post(api.adapters.create.path, async (req, res) => {
    try {
      const input = api.adapters.create.input.parse(req.body);
      const adapter = await storage.createAdapter(input);
      res.status(201).json(adapter);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.adapters.delete.path, async (req, res) => {
    await storage.deleteAdapter(Number(req.params.id));
    res.status(204).end();
  });

  // Namespaces
  app.get(api.namespaces.list.path, async (req, res) => {
    const nss = await storage.getNamespaces();
    res.json(nss);
  });

  app.post(api.namespaces.create.path, async (req, res) => {
    try {
      const bodySchema = api.namespaces.create.input.extend({
        storageAdapterId: z.coerce.number().optional(),
        quotaBytes: z.coerce.number().optional(),
      });
      const input = bodySchema.parse(req.body);
      const ns = await storage.createNamespace(input);
      res.status(201).json(ns);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.namespaces.delete.path, async (req, res) => {
    await storage.deleteNamespace(Number(req.params.id));
    res.status(204).end();
  });

  // Clients
  app.get(api.clients.list.path, async (req, res) => {
    const clients = await storage.getClients();
    res.json(clients);
  });

  app.post(api.clients.create.path, async (req, res) => {
    try {
      const input = api.clients.create.input.parse(req.body);
      const client = await storage.createClient(input);
      res.status(201).json(client);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.clients.delete.path, async (req, res) => {
    await storage.deleteClient(Number(req.params.id));
    res.status(204).end();
  });

  // Files & Stats
  app.get(api.files.list.path, async (req, res) => {
    const files = await storage.getFiles();
    res.json(files);
  });

  // File Upload
  app.post(api.files.upload.path, async (req, res) => {
    try {
      const bb = Busboy({ headers: req.headers });
      let namespaceId: number | null = null;
      let fileName: string | null = null;
      let mimeType: string | null = null;
      let fileBuffer: Buffer | null = null;

      bb.on("field", (fieldname, val) => {
        if (fieldname === "namespaceId") {
          namespaceId = Number(val);
        } else if (fieldname === "fileName") {
          fileName = val;
        } else if (fieldname === "mimeType") {
          mimeType = val;
        }
      });

      bb.on("file", (fieldname, file, filename, encoding, mimetype) => {
        const chunks: Buffer[] = [];
        file.on("data", (data) => {
          chunks.push(Buffer.from(data));
        });
        file.on("end", () => {
          fileBuffer = Buffer.concat(chunks);
          if (!mimeType) {
            mimeType = mimetype;
          }
          if (!fileName) {
            fileName = filename;
          }
        });
      });

      bb.on("finish", async () => {
        try {
          if (!namespaceId || !fileName || !mimeType || !fileBuffer) {
            return res.status(400).json({ message: "Missing required fields: namespaceId, fileName, mimeType, and file" });
          }

          const fileMetadata = await storage.uploadFile(
            namespaceId,
            fileName,
            fileBuffer,
            mimeType
          );

          res.status(201).json(fileMetadata);
        } catch (err) {
          console.error("Upload error:", err);
          res.status(400).json({ message: (err as Error).message });
        }
      });

      bb.on("error", (err) => {
        console.error("Busboy error:", err);
        res.status(400).json({ message: "Failed to parse upload" });
      });

      req.pipe(bb);
    } catch (err) {
      console.error("Upload handler error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // File Download
  app.get(api.files.download.path, async (req, res) => {
    try {
      const { namespaceId, fileName } = req.params;
      const buffer = await storage.downloadFile(Number(namespaceId), fileName);

      res.set("Content-Type", "application/octet-stream");
      res.set("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (err) {
      const message = (err as Error).message;
      if (message === "File not found") {
        return res.status(404).json({ message });
      }
      console.error("Download error:", err);
      res.status(400).json({ message });
    }
  });

  // File Delete
  app.delete(api.files.delete.path, async (req, res) => {
    try {
      await storage.deleteFile(Number(req.params.id));
      res.status(204).end();
    } catch (err) {
      const message = (err as Error).message;
      if (message === "File not found") {
        return res.status(404).json({ message });
      }
      console.error("Delete error:", err);
      res.status(400).json({ message });
    }
  });

  app.get(api.stats.get.path, async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });
  
  seedDatabase().catch(console.error);

  return httpServer;
}

export async function seedDatabase() {
  const adapters = await storage.getAdapters();
  if (adapters.length === 0) {
    const adapter = await storage.createAdapter({
      name: "Default Local Storage",
      type: "local",
      config: { path: "/var/data/ussp" },
      isDefault: true,
    });
    
    await storage.createNamespace({
      name: "public-assets",
      storageAdapterId: adapter.id,
      quotaBytes: 1024 * 1024 * 1024, // 1GB
    });
    
    await storage.createClient({
      name: "Demo Web App",
      redirectUris: "http://localhost:5000/callback",
    });
  }
}
