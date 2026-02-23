/**
 * Node.js/ブラウザ両対応のCryptoユーティリティ
 */

const isNode = typeof window === "undefined";

/**
 * ランダムなバイト列を生成
 */
export async function generateRandomBytes(length: number): Promise<Uint8Array> {
  if (isNode) {
    const crypto = await import("crypto");
    return new Uint8Array(crypto.randomBytes(length));
  } else {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }
}

/**
 * SHA256ハッシュを計算
 */
export async function sha256(data: string | Uint8Array): Promise<Uint8Array> {
  if (isNode) {
    const crypto = await import("crypto");
    const hash = crypto.createHash("sha256");
    if (typeof data === "string") {
      hash.update(data);
    } else {
      hash.update(Buffer.from(data));
    }
    return new Uint8Array(hash.digest());
  } else {
    const encoder = new TextEncoder();
    const dataBuffer = typeof data === "string" ? encoder.encode(data) : data;
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    return new Uint8Array(hashBuffer);
  }
}

/**
 * Base64URLエンコーディング
 */
export function base64UrlEncode(data: Uint8Array): string {
  if (isNode) {
    return Buffer.from(data).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  } else {
    const binaryString = String.fromCharCode(...Array.from(data));
    return btoa(binaryString).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
}

/**
 * PKCE Code Verifierを生成
 */
export async function generateCodeVerifier(): Promise<string> {
  const bytes = await generateRandomBytes(32);
  return base64UrlEncode(bytes);
}

/**
 * PKCE Code Challengeを生成
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hash = await sha256(codeVerifier);
  return base64UrlEncode(hash);
}
