export interface FileInfo {
  path: string;
  size: number;
  mimeType: string;
  etag: string;
  createdAt?: string;
}

export interface FileUploadOptions {
  namespaceId: number;
  path: string;
  data: Buffer | Blob | string;
  mimeType?: string;
  onProgress?: (progress: number) => void;
}

export interface FileListOptions {
  namespaceId: number;
  prefix?: string;
}

export class FilesClient {
  private ussp: any;

  constructor(ussp: any) {
    this.ussp = ussp;
  }

  /**
   * ファイルをアップロード
   */
  async upload(options: FileUploadOptions): Promise<FileInfo> {
    const { namespaceId, path, data, mimeType } = options;

    // DataをFormDataに変換
    const formData = new FormData();
    formData.append("namespaceId", namespaceId.toString());
    formData.append("path", path);

    if (data instanceof Blob) {
      formData.append("file", data);
    } else if (typeof data === "string") {
      formData.append("file", new Blob([data], { type: mimeType || "text/plain" }));
    } else {
      formData.append("file", new Blob([data], { type: mimeType || "application/octet-stream" }));
    }

    const response = await fetch(`${this.ussp.getServerUrl()}/api/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.ussp.getAccessToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Upload failed: ${error.error || response.statusText}`);
    }

    return response.json() as Promise<FileInfo>;
  }

  /**
   * ファイルをダウンロード
   */
  async download(namespaceId: number, path: string): Promise<Buffer | Blob> {
    const params = new URLSearchParams({
      namespaceId: namespaceId.toString(),
      path,
    });

    const response = await fetch(
      `${this.ussp.getServerUrl()}/api/files/download?${params}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.ussp.getAccessToken()}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Download failed: ${error.error || response.statusText}`);
    }

    // ブラウザ環境ではBlob、Node.js環境ではBufferを返す
    if (typeof window !== "undefined") {
      return response.blob();
    } else {
      return Buffer.from(await response.arrayBuffer());
    }
  }

  /**
   * ファイル情報を取得
   */
  async getFileInfo(namespaceId: number, path: string): Promise<FileInfo> {
    return this.ussp.request<FileInfo>("/api/files/info", {
      params: { namespaceId, path },
    });
  }

  /**
   * ファイルを削除
   */
  async delete(namespaceId: number, path: string): Promise<void> {
    await this.ussp.request("/api/files/delete", {
      method: "DELETE",
      data: { namespaceId, path },
    });
  }

  /**
   * ディレクトリをリスト
   */
  async list(options: FileListOptions): Promise<FileInfo[]> {
    const params = new URLSearchParams({
      namespaceId: options.namespaceId.toString(),
    });

    if (options.prefix) {
      params.append("prefix", options.prefix);
    }

    return this.ussp.request<FileInfo[]>("/api/files/list", {
      params: Object.fromEntries(params),
    });
  }

  /**
   * 複数ファイルをアップロード
   */
  async uploadMultiple(
    namespaceId: number,
    files: Array<{ path: string; data: Buffer | Blob | string; mimeType?: string }>
  ): Promise<FileInfo[]> {
    return Promise.all(
      files.map((file) =>
        this.upload({
          namespaceId,
          ...file,
        })
      )
    );
  }

  /**
   * ファイルを移動/リネーム
   */
  async move(
    namespaceId: number,
    fromPath: string,
    toPath: string
  ): Promise<FileInfo> {
    return this.ussp.request<FileInfo>("/api/files/move", {
      data: { namespaceId, fromPath, toPath },
    });
  }

  /**
   * ファイルをコピー
   */
  async copy(
    namespaceId: number,
    fromPath: string,
    toPath: string
  ): Promise<FileInfo> {
    return this.ussp.request<FileInfo>("/api/files/copy", {
      data: { namespaceId, fromPath, toPath },
    });
  }

  /**
   * ディレクトリを作成
   */
  async mkdir(namespaceId: number, path: string): Promise<void> {
    await this.ussp.request("/api/files/mkdir", {
      data: { namespaceId, path },
    });
  }

  /**
   * ダウンロードURLを取得（公開共有用）
   */
  async getPublicDownloadUrl(
    namespaceId: number,
    path: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const response = await this.ussp.request<{ url: string }>(
      "/api/files/public-url",
      {
        data: { namespaceId, path, expiresIn },
      }
    );
    return response.url;
  }
}
