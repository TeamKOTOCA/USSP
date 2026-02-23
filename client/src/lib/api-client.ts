const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  clearToken() {
    this.token = null;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          error: data?.error || response.statusText,
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0,
      };
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "GET" });
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // ファイルアップロード
  async uploadFile(
    namespaceId: number,
    path: string,
    file: File
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append("namespaceId", namespaceId.toString());
    formData.append("path", path);
    formData.append("file", file);

    try {
      const url = `${API_BASE}/api/files/upload`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          error: data?.error || response.statusText,
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0,
      };
    }
  }
}

export const apiClient = new ApiClient();
