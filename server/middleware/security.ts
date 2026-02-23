import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// セッション管理（簡易実装）
const adminSessions = new Map<string, { userId: number; expiresAt: number }>();

export interface AuthenticatedRequest extends Request {
  adminId?: number;
  tokenPayload?: { clientId: string; iat: number; exp: number };
  isPublicAccess?: boolean;
}

/**
 * Web UI 管理者セッション認証
 * Cookie経由のセッションをチェック
 */
export function requireAdminSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const sessionId = req.cookies?.["admin_session"];

  if (!sessionId) {
    return res.status(401).json({ error: "Admin session required" });
  }

  const session = adminSessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    adminSessions.delete(sessionId);
    return res.status(401).json({ error: "Session expired" });
  }

  req.adminId = session.userId;
  next();
}

/**
 * OAuth2 Bearer Token 認証
 * SDK/クライアント用のトークン検証
 */
export function requireOAuthToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Bearer token required" });
  }

  const token = authHeader.slice(7);

  try {
    const secret = process.env.JWT_SECRET || "dev-secret-key-change-in-production";
    const payload = jwt.verify(token, secret) as any;

    // トークン有効期限チェック
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: "Token expired" });
    }

    req.tokenPayload = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * 管理者 API 保護
 * Web UI からのセッションのみを許可
 */
export function adminOnly(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.adminId) {
    return res
      .status(403)
      .json({
        error:
          "Admin access required. Use Web UI to manage system configuration.",
      });
  }
  next();
}

/**
 * ファイル操作 API 保護
 * OAuth トークンまたは公開アクセスを許可
 */
export function requireFileAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const publicToken = req.query.public_token as string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    try {
      const secret =
        process.env.JWT_SECRET || "dev-secret-key-change-in-production";
      const payload = jwt.verify(token, secret) as any;

      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({ error: "Token expired" });
      }

      req.tokenPayload = payload;
      return next();
    } catch (err) {
      // Fall through to public check
    }
  }

  if (publicToken) {
    // 公開トークンの検証（簡易実装）
    if (validatePublicToken(publicToken)) {
      req.isPublicAccess = true;
      return next();
    }
  }

  return res
    .status(401)
    .json({
      error:
        "Authentication required. Use OAuth token or public token.",
    });
}

/**
 * 管理セッションを作成
 */
export function createAdminSession(userId: number): string {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24時間

  adminSessions.set(sessionId, { userId, expiresAt });

  // 古いセッションをクリーンアップ
  for (const [id, session] of adminSessions) {
    if (session.expiresAt < Date.now()) {
      adminSessions.delete(id);
    }
  }

  return sessionId;
}

/**
 * 公開トークンの検証
 */
function validatePublicToken(token: string): boolean {
  // TODO: データベースから公開トークンを検証
  // 現在は簡易実装
  return token.length > 0;
}

/**
 * CSRF 保護トークン生成
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * CSRF 保護トークン検証
 */
export function verifyCSRFToken(token: string, stored: string): boolean {
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(stored));
}
