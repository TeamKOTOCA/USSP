import { OAuthClient } from "./oauth";
import { FilesClient } from "./files";
import { BackupClient } from "./backup";
import { AdminClient } from "./admin";

export interface USSPConfig {
  serverUrl: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * USSP SDK - JavaScript/TypeScript SDKでUSSPストレージプラットフォームを使用
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
 * await ussp.files.upload(namespaceId, 'path/to/file.txt', fileData);
 * 
 * // ファイルダウンロード
 * const data = await ussp.files.download(namespaceId, 'path/to/file.txt');
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
   * APIリクエストを実行
   */
  async request<T>(
    method: string,
    endpoint: string,
    options?: {
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

    const response = await fetch(url, {
      method,
      headers,
      body: options?.data ? JSON.stringify(options.data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `API request failed: ${response.status} ${error.error || response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }
}

// エクスポート
export type { OAuthAuthorizeOptions, OAuthToken } from "./oauth";
export type { FileUploadOptions, FileInfo } from "./files";
export type { BackupJobOptions, BackupJob } from "./backup";
export type { AdminUser, AdminNamespace } from "./admin";

export default USSP;
