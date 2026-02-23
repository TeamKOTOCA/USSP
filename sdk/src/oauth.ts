import { generateCodeVerifier, generateCodeChallenge } from "./crypto-utils";

export interface OAuthAuthorizeOptions {
  redirectUri: string;
  state?: string;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
}

export interface OAuthCodeResponse {
  code: string;
  state?: string;
}

export class OAuthClient {
  private ussp: any;

  constructor(ussp: any) {
    this.ussp = ussp;
  }

  /**
   * 認可URL を生成してユーザーをリダイレクト
   */
  async generateAuthorizeUrl(options: OAuthAuthorizeOptions): Promise<string> {
    const clientId = this.ussp.getClientId();
    if (!clientId) {
      throw new Error("clientId is required for OAuth");
    }

    // PKCE チャレンジを生成
    const codeVerifier = await generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // ローカルストレージに保存（ブラウザ環境）
    if (typeof window !== "undefined") {
      sessionStorage.setItem("oauth_code_verifier", codeVerifier);
      if (options.state) {
        sessionStorage.setItem("oauth_state", options.state);
      }
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: options.redirectUri,
      response_type: "code",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      scope: "storage:read storage:write storage:admin",
    });

    if (options.state) {
      params.append("state", options.state);
    }

    return `${this.ussp.getServerUrl()}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Authorization Codeをアクセストークンと交換
   */
  async exchangeCode(code: string): Promise<OAuthToken> {
    const isNode = typeof window === "undefined";
    const codeVerifier = isNode
      ? null
      : sessionStorage.getItem("oauth_code_verifier");

    if (!codeVerifier) {
      throw new Error("Code verifier not found. Did you call generateAuthorizeUrl?");
    }

    const clientId = this.ussp.getClientId();
    if (!clientId) {
      throw new Error("clientId is required");
    }

    try {
      const response = await this.ussp.request<OAuthToken>("/oauth/token", {
        method: "POST",
        data: {
          code,
          client_id: clientId,
          code_verifier: codeVerifier,
          grant_type: "authorization_code",
        },
      });

      // トークンをメモリに保存
      this.ussp.setAccessToken(response.accessToken);

      // ローカルストレージをクリア
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("oauth_code_verifier");
        sessionStorage.removeItem("oauth_state");
      }

      return response;
    } catch (error) {
      console.error("Failed to exchange code for token:", error);
      throw error;
    }
  }

  /**
   * 簡易認可フロー（ブラウザのポップアップを使用）
   * ブラウザ環境のみ対応
   */
  async authorize(options: OAuthAuthorizeOptions): Promise<OAuthToken> {
    if (typeof window === "undefined") {
      throw new Error("authorize() is only available in browser environment. Use generateAuthorizeUrl() and exchangeCode() separately.");
    }

    const authorizeUrl = await this.generateAuthorizeUrl(options);

    // ポップアップウィンドウを開く
    const width = 500;
    const height = 600;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;

    return new Promise((resolve, reject) => {
      const popup = window.open(
        authorizeUrl,
        "oauth_window",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        reject(new Error("Failed to open popup window"));
        return;
      }

      // ポップアップからのメッセージをリッスン
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== new URL(options.redirectUri).origin) {
          return;
        }

        if (event.data.type === "oauth_callback" && event.data.code) {
          window.removeEventListener("message", messageHandler);
          popup.close();

          try {
            const token = await this.exchangeCode(event.data.code);
            resolve(token);
          } catch (error) {
            reject(error);
          }
        }
      };

      window.addEventListener("message", messageHandler);

      // タイムアウト（10分）
      setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        reject(new Error("OAuth authorization timeout"));
      }, 10 * 60 * 1000);
    });
  }

  /**
   * トークンをリフレッシュ
   */
  async refreshToken(refreshToken: string): Promise<OAuthToken> {
    const clientId = this.ussp.getClientId();
    if (!clientId) {
      throw new Error("clientId is required");
    }

    try {
      const response = await this.ussp.request<OAuthToken>("/oauth/token", {
        method: "POST",
        data: {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
        },
      });

      this.ussp.setAccessToken(response.accessToken);
      return response;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      throw error;
    }
  }

  /**
   * トークンを無効化
   */
  async revokeToken(): Promise<void> {
    this.ussp.setAccessToken(null);
  }
}
