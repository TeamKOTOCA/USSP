import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import {
  generatePKCEChallenge,
  createAuthorizationCode,
  exchangeCodeForToken,
  validateAccessToken,
} from "./oauth";
import { fileHandler } from "./file-handler";
import { backupProcessor } from "./backup-queue";
import { userManagement } from "./user-management";
import {
  requireAdminSession,
  requireOAuthToken,
  adminOnly,
  requireFileAccess,
  createAdminSession,
  generateCSRFToken,
  type AuthenticatedRequest,
} from "./middleware/security";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Adapters (Web UI Admin Only)
  app.get(api.adapters.list.path, requireAdminSession as any, adminOnly as any, async (req, res) => {
    const adapters = await storage.getAdapters();
    res.json(adapters);
  });

  app.post(api.adapters.create.path, requireAdminSession as any, adminOnly as any, async (req, res) => {
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

  app.delete(api.adapters.delete.path, requireAdminSession as any, adminOnly as any, async (req, res) => {
    await storage.deleteAdapter(Number(req.params.id));
    res.status(204).end();
  });

  // Namespaces (Web UI Admin Only)
  app.get(api.namespaces.list.path, requireAdminSession as any, adminOnly as any, async (req, res) => {
    const nss = await storage.getNamespaces();
    res.json(nss);
  });

  app.post(api.namespaces.create.path, requireAdminSession as any, adminOnly as any, async (req, res) => {
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

  app.delete(api.namespaces.delete.path, requireAdminSession as any, adminOnly as any, async (req, res) => {
    await storage.deleteNamespace(Number(req.params.id));
    res.status(204).end();
  });

  // Clients (Web UI Admin Only)
  app.get(api.clients.list.path, requireAdminSession as any, adminOnly as any, async (req, res) => {
    const clients = await storage.getClients();
    res.json(clients);
  });

  app.post(api.clients.create.path, requireAdminSession as any, adminOnly as any, async (req, res) => {
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

  app.delete(api.clients.delete.path, requireAdminSession as any, adminOnly as any, async (req, res) => {
    await storage.deleteClient(Number(req.params.id));
    res.status(204).end();
  });

  // Files & Stats
  app.get(api.files.list.path, async (req, res) => {
    const files = await storage.getFiles();
    res.json(files);
  });

  app.get(api.stats.get.path, async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  // OAuth Endpoints
  app.get("/oauth/authorize", async (req, res) => {
    try {
      const clientId = req.query.client_id as string;
      const redirectUri = req.query.redirect_uri as string;
      const codeChallenge = req.query.code_challenge as string;
      const codeChallengeMethod = (req.query.code_challenge_method as string) || "plain";
      const state = req.query.state as string;

      if (!clientId || !redirectUri) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      // Auto-provision OAuth client and namespace from developer-defined client_id
      const client = await storage.ensureOAuthClient(clientId, redirectUri);
      await storage.ensureNamespaceForClient(clientId);

      // Verify redirect URI after provisioning
      if (!client.redirectUris.split(",").map((uri) => uri.trim()).includes(redirectUri)) {
        return res.status(400).json({ error: "Invalid redirect_uri" });
      }

      // Generate authorization code
      const code = await createAuthorizationCode(
        clientId,
        redirectUri,
        codeChallenge,
        codeChallengeMethod as "S256" | "plain"
      );

      // Redirect to client with code
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set("code", code);
      if (state) redirectUrl.searchParams.set("state", state);

      res.redirect(redirectUrl.toString());
    } catch (err) {
      console.error("OAuth authorize error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/oauth/token", async (req, res) => {
    try {
      const { code, client_id, code_verifier } = req.body;

      if (!code || !client_id || !code_verifier) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const result = await exchangeCodeForToken(code, client_id, code_verifier);
      if (!result) {
        return res.status(400).json({ error: "Invalid code or verifier" });
      }

      res.json({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        token_type: "Bearer",
        expires_in: 3600,
      });
    } catch (err) {
      console.error("OAuth token error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // File Operations (OAuth Token Required)
  app.post("/api/files/upload", requireOAuthToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.tokenPayload?.clientId) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { namespaceId, path: filePath } = req.body;
      if (!namespaceId || !filePath) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get namespace and adapter
      const namespaces = await storage.getNamespaces();
      const ns = namespaces.find((n) => n.id === namespaceId);
      if (!ns) {
        return res.status(404).json({ error: "Namespace not found" });
      }

      const adapters = await storage.getAdapters();
      const adapter = adapters.find((a) => a.id === ns.storageAdapterId);
      if (!adapter) {
        return res.status(500).json({ error: "Storage adapter not found" });
      }

      // Upload file
      const fileInfo = await fileHandler.uploadFile(
        { type: adapter.type as any, config: (adapter.config ?? {}) as Record<string, any> },
        filePath,
        req.rawBody as Buffer
      );

      res.status(201).json(fileInfo);
    } catch (err) {
      console.error("File upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.get("/api/files/download", requireOAuthToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.tokenPayload?.clientId) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { namespaceId, path: filePath } = req.query;
      if (!namespaceId || !filePath) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const namespaces = await storage.getNamespaces();
      const ns = namespaces.find((n) => n.id === Number(namespaceId));
      if (!ns) {
        return res.status(404).json({ error: "Namespace not found" });
      }

      const adapters = await storage.getAdapters();
      const adapter = adapters.find((a) => a.id === ns.storageAdapterId);
      if (!adapter) {
        return res.status(500).json({ error: "Storage adapter not found" });
      }

      const data = await fileHandler.downloadFile(
        { type: adapter.type as any, config: (adapter.config ?? {}) as Record<string, any> },
        filePath as string
      );

      if (!data) {
        return res.status(404).json({ error: "File not found" });
      }

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${filePath}"`);
      res.send(data);
    } catch (err) {
      console.error("File download error:", err);
      res.status(500).json({ error: "Download failed" });
    }
  });

  // Admin User Management Endpoints (Web UI Admin Only)
  app.post("/api/admin/users", requireAdminSession as any, adminOnly as any, async (req, res) => {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const user = await userManagement.createUser({
        username,
        email,
        password,
        role: role || "user",
      });

      res.status(201).json(user);
    } catch (err) {
      console.error("User creation error:", err);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/admin/users", requireAdminSession as any, adminOnly as any, async (req, res) => {
    try {
      const users = await userManagement.getAllUsers();
      res.json(users);
    } catch (err) {
      console.error("Get users error:", err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:id", requireAdminSession as any, adminOnly as any, async (req, res) => {
    try {
      const user = await userManagement.getUser(Number(req.params.id));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (err) {
      console.error("Get user error:", err);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.patch("/api/admin/users/:id", requireAdminSession as any, adminOnly as any, async (req, res) => {
    try {
      const { email, role, isActive, password } = req.body;

      const user = await userManagement.updateUser(Number(req.params.id), {
        email,
        role,
        isActive,
        password,
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (err) {
      console.error("User update error:", err);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdminSession as any, adminOnly as any, async (req, res) => {
    try {
      await userManagement.deleteUser(Number(req.params.id));
      res.status(204).end();
    } catch (err) {
      console.error("User deletion error:", err);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Missing credentials" });
      }

      const isValid = await userManagement.verifyPassword(username, password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const user = await userManagement.getUserByUsername(username);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: "User is not active" });
      }

      await userManagement.updateLastLogin(user.id);

      // Create secure session cookie
      const sessionId = createAdminSession(user.id);
      res.cookie("admin_session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      console.error("Admin login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Backup Queue Endpoints (OAuth Token Required)
  app.post("/api/backup/create", requireOAuthToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.tokenPayload?.clientId) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { fileId, sourceAdapterId, targetAdapterId } = req.body;
      if (!fileId || !sourceAdapterId || !targetAdapterId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const job = await backupProcessor.createBackupJob(
        fileId,
        sourceAdapterId,
        targetAdapterId
      );

      res.status(201).json(job);
    } catch (err) {
      console.error("Backup creation error:", err);
      res.status(500).json({ error: "Failed to create backup job" });
    }
  });

  app.get("/api/backup/status", requireOAuthToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.tokenPayload?.clientId) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const status = req.query.status as string | undefined;
      const jobs = await backupProcessor.getBackupJobs(status);

      res.json(jobs);
    } catch (err) {
      console.error("Backup status error:", err);
      res.status(500).json({ error: "Failed to fetch backup jobs" });
    }
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
