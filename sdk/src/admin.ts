export interface AdminUser {
  id: number;
  username: string;
  email?: string;
  role: "admin" | "user";
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AdminNamespace {
  id: number;
  name: string;
  storageAdapterId: number;
  ownerId: number;
  createdAt: string;
}

export interface AdminAdapter {
  id: number;
  name: string;
  type: "local" | "s3" | "gdrive";
  config: Record<string, any>;
  createdAt: string;
}

export interface AdminOAuthClient {
  id: number;
  clientId: string;
  clientSecret: string;
  name: string;
  redirectUris: string[];
  createdAt: string;
}

export class AdminClient {
  private ussp: any;

  constructor(ussp: any) {
    this.ussp = ussp;
  }

  // ============ User Management ============

  /**
   * ユーザーを作成
   */
  async createUser(data: {
    username: string;
    email?: string;
    password: string;
    role?: "admin" | "user";
  }): Promise<AdminUser> {
    return this.ussp.request<AdminUser>("/api/admin/users", {
      method: "POST",
      data,
    });
  }

  /**
   * すべてのユーザーを取得
   */
  async getUsers(): Promise<AdminUser[]> {
    return this.ussp.request<AdminUser[]>("/api/admin/users");
  }

  /**
   * ユーザーを取得
   */
  async getUser(userId: number): Promise<AdminUser> {
    return this.ussp.request<AdminUser>(`/api/admin/users/${userId}`);
  }

  /**
   * ユーザーを更新
   */
  async updateUser(
    userId: number,
    data: Partial<AdminUser> & { password?: string }
  ): Promise<AdminUser> {
    return this.ussp.request<AdminUser>(`/api/admin/users/${userId}`, {
      method: "PATCH",
      data,
    });
  }

  /**
   * ユーザーを削除
   */
  async deleteUser(userId: number): Promise<void> {
    await this.ussp.request(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });
  }

  /**
   * ユーザーの権限を変更
   */
  async changeUserRole(
    userId: number,
    role: "admin" | "user"
  ): Promise<AdminUser> {
    return this.updateUser(userId, { role });
  }

  /**
   * ユーザーを有効化/無効化
   */
  async toggleUserActive(userId: number, isActive: boolean): Promise<AdminUser> {
    return this.updateUser(userId, { isActive });
  }

  // ============ Namespace Management ============

  /**
   * 名前空間を作成
   */
  async createNamespace(data: {
    name: string;
    storageAdapterId: number;
    ownerId: number;
  }): Promise<AdminNamespace> {
    return this.ussp.request<AdminNamespace>("/api/admin/namespaces", {
      method: "POST",
      data,
    });
  }

  /**
   * すべての名前空間を取得
   */
  async getNamespaces(): Promise<AdminNamespace[]> {
    return this.ussp.request<AdminNamespace[]>("/api/admin/namespaces");
  }

  /**
   * 名前空間を取得
   */
  async getNamespace(namespaceId: number): Promise<AdminNamespace> {
    return this.ussp.request<AdminNamespace>(
      `/api/admin/namespaces/${namespaceId}`
    );
  }

  /**
   * 名前空間を更新
   */
  async updateNamespace(
    namespaceId: number,
    data: Partial<AdminNamespace>
  ): Promise<AdminNamespace> {
    return this.ussp.request<AdminNamespace>(
      `/api/admin/namespaces/${namespaceId}`,
      { method: "PATCH", data }
    );
  }

  /**
   * 名前空間を削除
   */
  async deleteNamespace(namespaceId: number): Promise<void> {
    await this.ussp.request(`/api/admin/namespaces/${namespaceId}`, {
      method: "DELETE",
    });
  }

  // ============ Storage Adapter Management ============

  /**
   * ストレージアダプターを作成
   */
  async createAdapter(data: {
    name: string;
    type: "local" | "s3" | "gdrive";
    config: Record<string, any>;
  }): Promise<AdminAdapter> {
    return this.ussp.request<AdminAdapter>("/api/admin/adapters", {
      method: "POST",
      data,
    });
  }

  /**
   * すべてのアダプターを取得
   */
  async getAdapters(): Promise<AdminAdapter[]> {
    return this.ussp.request<AdminAdapter[]>("/api/admin/adapters");
  }

  /**
   * アダプターを取得
   */
  async getAdapter(adapterId: number): Promise<AdminAdapter> {
    return this.ussp.request<AdminAdapter>(`/api/admin/adapters/${adapterId}`);
  }

  /**
   * アダプターを更新
   */
  async updateAdapter(
    adapterId: number,
    data: Partial<AdminAdapter>
  ): Promise<AdminAdapter> {
    return this.ussp.request<AdminAdapter>(`/api/admin/adapters/${adapterId}`, {
      method: "PATCH",
      data,
    });
  }

  /**
   * アダプターを削除
   */
  async deleteAdapter(adapterId: number): Promise<void> {
    await this.ussp.request(`/api/admin/adapters/${adapterId}`, {
      method: "DELETE",
    });
  }

  /**
   * アダプターの接続をテスト
   */
  async testAdapterConnection(adapterId: number): Promise<boolean> {
    const response = await this.ussp.request<{ connected: boolean }>(
      `/api/admin/adapters/${adapterId}/test`
    );
    return response.connected;
  }

  // ============ OAuth Client Management ============

  /**
   * OAuthクライアントを作成
   */
  async createOAuthClient(data: {
    name: string;
    redirectUris: string[];
  }): Promise<AdminOAuthClient> {
    return this.ussp.request<AdminOAuthClient>("/api/admin/oauth-clients", {
      method: "POST",
      data,
    });
  }

  /**
   * すべてのOAuthクライアントを取得
   */
  async getOAuthClients(): Promise<AdminOAuthClient[]> {
    return this.ussp.request<AdminOAuthClient[]>("/api/admin/oauth-clients");
  }

  /**
   * OAuthクライアントを取得
   */
  async getOAuthClient(clientId: string): Promise<AdminOAuthClient> {
    return this.ussp.request<AdminOAuthClient>(
      `/api/admin/oauth-clients/${clientId}`
    );
  }

  /**
   * OAuthクライアントを削除
   */
  async deleteOAuthClient(clientId: string): Promise<void> {
    await this.ussp.request(`/api/admin/oauth-clients/${clientId}`, {
      method: "DELETE",
    });
  }

  // ============ System Administration ============

  /**
   * システム統計を取得
   */
  async getSystemStats(): Promise<{
    users: number;
    namespaces: number;
    adapters: number;
    totalStorageBytes: number;
    backupJobsPending: number;
  }> {
    return this.ussp.request("/api/admin/stats");
  }

  /**
   * システム設定を取得
   */
  async getSystemConfig(): Promise<Record<string, any>> {
    return this.ussp.request("/api/admin/config");
  }

  /**
   * システム設定を更新
   */
  async updateSystemConfig(config: Record<string, any>): Promise<void> {
    await this.ussp.request("/api/admin/config", {
      method: "PUT",
      data: config,
    });
  }

  /**
   * システムヘルスチェック
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    database: boolean;
    storage: boolean;
    message?: string;
  }> {
    return this.ussp.request("/api/admin/health");
  }
}
