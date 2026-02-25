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
  destroyAdminSession,
  getSessionUserId,
  type AuthenticatedRequest,
} from "./middleware/security";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const renderAuthorizePage = (params: {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    state?: string;
    scope: string;
    user: string;
    providerUrl: string;
  }): string => {
    const scopeItems = params.scope
      .split(" ")
      .map((scope) => scope.trim())
      .filter(Boolean)
      .map((scope) => `<li>${escapeHtml(scope)}</li>`)
      .join("");

    const hiddenInput = (name: string, value?: string) =>
      value ? `<input type=\"hidden\" name=\"${name}\" value=\"${escapeHtml(value)}\">` : "";

    return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>USSP OAuth 認証確認</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f5f7fb; color: #111827; }
      .card { max-width: 560px; margin: 48px auto; background: #ffffff; border-radius: 14px; padding: 24px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      h1 { margin: 0 0 12px; font-size: 22px; }
      p { margin: 0 0 16px; color: #374151; }
      .kv { margin: 0 0 14px; }
      .kv dt { font-weight: 600; margin-bottom: 4px; }
      .kv dd { margin: 0; color: #111827; word-break: break-all; }
      ul { margin: 8px 0 16px 22px; }
      .actions { display: flex; gap: 12px; margin-top: 20px; }
      button { border: 0; border-radius: 8px; cursor: pointer; padding: 10px 14px; font-size: 14px; }
      .approve { background: #2563eb; color: #fff; }
      .deny { background: #e5e7eb; color: #111827; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>OAuth 認証の確認</h1>
      <p>このアプリケーションにアクセス権限を付与しますか？</p>

      <dl>
        <div class="kv">
          <dt>クライアントID</dt>
          <dd>${escapeHtml(params.clientId)}</dd>
        </div>
        <div class="kv">
          <dt>ユーザー</dt>
          <dd>${escapeHtml(params.user)}</dd>
        </div>
        <div class="kv">
          <dt>提供URL</dt>
          <dd>${escapeHtml(params.providerUrl)}</dd>
        </div>
        <div class="kv">
          <dt>スコープ</dt>
          <dd>
            <ul>${scopeItems || "<li>(なし)</li>"}</ul>
          </dd>
        </div>
      </dl>

      <form method="post" action="/oauth/authorize/approve">
        ${hiddenInput("client_id", params.clientId)}
        ${hiddenInput("redirect_uri", params.redirectUri)}
        ${hiddenInput("code_challenge", params.codeChallenge)}
        ${hiddenInput("code_challenge_method", params.codeChallengeMethod)}
        ${hiddenInput("state", params.state)}
        ${hiddenInput("scope", params.scope)}
        ${hiddenInput("user", params.user)}
        ${hiddenInput("provider_url", params.providerUrl)}

        <div class="actions">
          <button class="approve" type="submit">許可する</button>
          <button class="deny" type="button" onclick="window.close()">閉じる</button>
        </div>
      </form>
    </div>
  </body>
</html>`;
  };

  const renderOAuthLoginPage = (params: {
    authorizeUrl: string;
    error?: string;
  }): string => `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>USSP ログイン</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f5f7fb; color: #111827; }
      .card { max-width: 440px; margin: 56px auto; background: #ffffff; border-radius: 14px; padding: 24px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      h1 { margin: 0 0 12px; font-size: 22px; }
      .error { background: #fef2f2; color: #b91c1c; border-radius: 8px; padding: 10px; margin: 0 0 12px; }
      .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
      input { border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; padding: 10px; }
      button { border: 0; border-radius: 8px; cursor: pointer; padding: 10px 14px; font-size: 14px; background: #2563eb; color: #fff; width: 100%; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>USSP にログイン</h1>
      ${params.error ? `<p class="error">${escapeHtml(params.error)}</p>` : ""}
      <form method="post" action="/oauth/login">
        <input type="hidden" name="authorize_url" value="${escapeHtml(params.authorizeUrl)}" />
        <div class="field">
          <label for="username">ユーザー名</label>
          <input id="username" name="username" required />
        </div>
        <div class="field">
          <label for="password">パスワード</label>
          <input id="password" name="password" type="password" required />
        </div>
        <button type="submit">ログインして続行</button>
      </form>
    </div>
  </body>
</html>`;

  app.get("/api/admin/setup-status", async (_req, res) => {
    const hasUsers = await userManagement.hasAnyUsers();
    res.json({ requiresSetup: !hasUsers });
  });

  app.post("/api/admin/setup", async (req, res) => {
    try {
      const hasUsers = await userManagement.hasAnyUsers();
      if (hasUsers) {
        return res.status(409).json({ error: "Initial setup already completed" });
      }

      const { username, password, email } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const user = await userManagement.createUser({
        username,
        password,
        email,
        role: "admin",
      });

      const sessionId = createAdminSession(user.id);
      res.cookie("admin_session", sessionId, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      console.error("Initial admin setup error:", err);
      res.status(500).json({ error: "Failed to create initial admin account" });
    }
  });

  app.get("/api/admin/session", requireAdminSession as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.adminId) {
        return res.status(401).json({ error: "Admin session required" });
      }

      const user = await userManagement.getUser(req.adminId);
      if (!user) {
        return res.status(401).json({ error: "Session user not found" });
      }

      res.json({ user });
    } catch (err) {
      console.error("Session check error:", err);
      res.status(500).json({ error: "Session check failed" });
    }
  });


  app.post("/api/admin/logout", requireAdminSession as any, async (req: AuthenticatedRequest, res) => {
    const sessionId = req.headers.cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("admin_session="))
      ?.slice("admin_session=".length);

    destroyAdminSession(sessionId);
    res.clearCookie("admin_session");
    res.status(204).end();
  });

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
      const scope = (req.query.scope as string) || "storage:read storage:write storage:admin";
      const providerUrl = (req.query.provider_url as string) || req.get("origin") || clientId;

      if (!clientId || !redirectUri || !codeChallenge) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      // Auto-provision OAuth client and namespace from developer-defined client_id
      const client = await storage.ensureOAuthClient(clientId, redirectUri);
      await storage.ensureNamespaceForClient(clientId);

      const sessionUserId = getSessionUserId(req);
      if (!sessionUserId) {
        const authorizeUrl = req.originalUrl || req.url;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(renderOAuthLoginPage({ authorizeUrl }));
      }

      const sessionUser = await userManagement.getUser(sessionUserId);
      if (!sessionUser || !sessionUser.isActive) {
        return res.status(401).json({ error: "User session invalid" });
      }

      // Verify redirect URI after provisioning
      if (!client.redirectUris.split(",").map((uri) => uri.trim()).includes(redirectUri)) {
        return res.status(400).json({ error: "Invalid redirect_uri" });
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(
        renderAuthorizePage({
          clientId,
          redirectUri,
          codeChallenge,
          codeChallengeMethod,
          state,
          scope,
          user: sessionUser.username,
          providerUrl,
        })
      );
    } catch (err) {
      console.error("OAuth authorize error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/oauth/authorize/approve", async (req, res) => {
    try {
      const clientId = req.body.client_id as string;
      const redirectUri = req.body.redirect_uri as string;
      const codeChallenge = req.body.code_challenge as string;
      const codeChallengeMethod = (req.body.code_challenge_method as string) || "plain";
      const state = req.body.state as string | undefined;
      const sessionUserId = getSessionUserId(req);

      if (!clientId || !redirectUri || !codeChallenge || !sessionUserId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const code = await createAuthorizationCode(
        clientId,
        redirectUri,
        codeChallenge,
        codeChallengeMethod as "S256" | "plain",
        sessionUserId,
      );

      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set("code", code);
      if (state) redirectUrl.searchParams.set("state", state);

      res.redirect(redirectUrl.toString());
    } catch (err) {
      console.error("OAuth authorize approve error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/oauth/login", async (req, res) => {
    try {
      const username = req.body.username as string;
      const password = req.body.password as string;
      const authorizeUrl = req.body.authorize_url as string;

      if (!username || !password || !authorizeUrl) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      if (!authorizeUrl.startsWith("/oauth/authorize")) {
        return res.status(400).json({ error: "Invalid authorize_url" });
      }

      const isValid = await userManagement.verifyPassword(username, password);
      if (!isValid) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(401).send(renderOAuthLoginPage({ authorizeUrl, error: "ユーザー名またはパスワードが不正です。" }));
      }

      const user = await userManagement.getUserByUsername(username);
      if (!user || !user.isActive) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(401).send(renderOAuthLoginPage({ authorizeUrl, error: "利用できないユーザーです。" }));
      }

      await userManagement.updateLastLogin(user.id);
      const sessionId = createAdminSession(user.id);
      res.cookie("admin_session", sessionId, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.redirect(authorizeUrl);
    } catch (err) {
      console.error("OAuth login error:", err);
      res.status(500).json({ error: "Login failed" });
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
        secure: false,
        sameSite: "lax",
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
