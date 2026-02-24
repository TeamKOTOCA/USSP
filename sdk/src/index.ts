import { OAuthClient } from "./oauth";
import { FilesClient } from "./files";
import { BackupClient } from "./backup";
import { AdminClient } from "./admin";
import { httpRequest } from "./http-client";

export interface USSPConfig {
  serverUrl: string;
  clientId: string;
  clientSecret?: string;
}

/**
 * USSP SDK - JavaScript/TypeScript SDKでUSSPストレージプラットフォームを使用
 * Node.js/ブラウザ両対応
 * 
 * 使用例:
 * ```typescript
 * const ussp = new USSP({
 *   serverUrl: 'https://api.ussp.example.com',
 *   clientId: 'your-client-id',
 * });
 * 
 * // OAuth認証
 * const { accessToken } = await ussp.oauth.authorize({
 *   redirectUri: 'https://yourapp.example.com/callback',
 * });
 * 
 * // ファイルアップロード
 * await ussp.files.upload({
 *   namespaceId: 1,
 *   path: 'path/to/file.txt',
 *   data: 'file content',
 * });
 * 
 * // ファイルダウンロード
 * const data = await ussp.files.download(1, 'path/to/file.txt');
 * ```
 */
export class USSP {
  private config: USSPConfig;
  private accessToken: string | null = null;

  public oauth: OAuthClient;
  public files: FilesClient;
  public backup: BackupClient;
  public admin: AdminClient;

  constructor(config: USSPConfig) {
    this.config = config;

    this.oauth = new OAuthClient(this);
    this.files = new FilesClient(this);
    this.backup = new BackupClient(this);
    this.admin = new AdminClient(this);
  }

  /**
   * アクセストークンを設定
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * アクセストークンを取得
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * サーバーURLを取得
   */
  getServerUrl(): string {
    return this.config.serverUrl;
  }

  /**
   * クライアントIDを取得
   */
  getClientId(): string | undefined {
    return this.config.clientId;
  }

  /**
   * APIリクエストを実行（Node.js/ブラウザ両対応）
   */
  async request<T>(
    endpoint: string,
    options?: {
      method?: string;
      data?: any;
      params?: Record<string, any>;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    const url = `${this.config.serverUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options?.headers,
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await httpRequest<T>(url, {
      method: options?.method || "GET",
      data: options?.data,
      params: options?.params,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.error?.error || "Unknown error"}`
      );
    }

    return response.data as T;
  }
}

// エクスポート
export type { OAuthAuthorizeOptions, OAuthToken } from "./oauth";
export type { FileUploadOptions, FileInfo } from "./files";
export type { BackupJobOptions, BackupJob } from "./backup";
export type { AdminUser, AdminNamespace } from "./admin";

export default USSP;
