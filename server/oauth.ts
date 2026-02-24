import crypto from "crypto";
import { db } from "./db";
import { oauthTokens, oauthClients } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256" | "plain";
}

export function generatePKCEChallenge(): PKCEChallenge {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256",
  };
}

export function verifyPKCEChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: "S256" | "plain"
): boolean {
  if (method === "plain") {
    return codeVerifier === codeChallenge;
  }
  
  const computed = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  
  return computed === codeChallenge;
}

export function generateAuthCode(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateAccessToken(clientId: string): string {
  const payload = {
    clientId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };
  
  // Simple JWT format (header.payload.signature)
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const secret = process.env.JWT_SECRET || "dev-secret-key-change-in-production";
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  
  return `${header}.${body}.${signature}`;
}

export async function createAuthorizationCode(
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  codeChallengeMethod: "S256" | "plain"
): Promise<string> {
  const code = generateAuthCode();
  
  await db.insert(oauthTokens).values({
    clientId,
    code,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
  });
  
  return code;
}

export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  codeVerifier: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const [token] = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.code, code))
    .limit(1);
  
  if (!token || token.clientId !== clientId) {
    return null;
  }
  
  // Verify PKCE
  if (token.codeChallenge) {
    const isValid = verifyPKCEChallenge(
      codeVerifier,
      token.codeChallenge,
      token.codeChallengeMethod as "S256" | "plain"
    );
    
    if (!isValid) {
      return null;
    }
  }
  
  const accessToken = generateAccessToken(token.clientId);
  const refreshToken = crypto.randomBytes(32).toString("hex");
  
  await db
    .update(oauthTokens)
    .set({
      accessToken,
      refreshToken,
      code: null,
      expiresAt: new Date(Date.now() + 3600000),
    })
    .where(eq(oauthTokens.code, code));
  
  return { accessToken, refreshToken };
}

export async function validateAccessToken(
  accessToken: string
): Promise<{ clientId: string } | null> {
  const [token] = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.accessToken, accessToken))
    .limit(1);
  
  if (!token) {
    return null;
  }
  
  // Check if expired
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
    return null;
  }
  
  return { clientId: token.clientId };
}
