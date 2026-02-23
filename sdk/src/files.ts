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
   * ファイルをアップロード（Node.js/ブラウザ両対応）
   */
  async upload(options: FileUploadOptions): Promise<FileInfo> {
    const { namespaceId, path, data, mimeType } = options;
    const isNode = typeof window === "undefined";

    let body: any;
    let headers: Record<string, string> = {
      Authorization: `Bearer ${this.ussp.getAccessToken()}`,
    };

    if (isNode) {
      // Node.js環境: multipart/form-dataを手動で構築
      const boundary = "----FormBoundary" + Math.random().toString(36).substr(2);
      headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`;

      let bodyString = "";
      bodyString += `--${boundary}\r\n`;
      bodyString += `Content-Disposition: form-data; name="namespaceId"\r\n\r\n`;
      bodyString += `${namespaceId}\r\n`;
      bodyString += `--${boundary}\r\n`;
      bodyString += `Content-Disposition: form-data; name="path"\r\n\r\n`;
      bodyString += `${path}\r\n`;
      bodyString += `--${boundary}\r\n`;
      bodyString += `Content-Disposition: form-data; name="file"; filename="${path}"\r\n`;
      bodyString += `Content-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`;

      const dataBuffer = Buffer.isBuffer(data)
        ? data
        : Buffer.from(typeof data === "string" ? data : Buffer.from(data));

      const endBoundary = `\r\n--${boundary}--\r\n`;

      body = Buffer.concat([
        Buffer.from(bodyString),
        dataBuffer,
        Buffer.from(endBoundary),
      ]);
    } else {
      // ブラウザ環境: FormDataを使用
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

      body = formData;
    }

    const response = await this.ussp.request<FileInfo>("/api/files/upload", {
      method: "POST",
      data: body,
      headers,
    });

    return response;
  }

  /**
   * ファイルをダウンロード（Node.js/ブラウザ両対応）
   */
  async download(namespaceId: number, path: string): Promise<Buffer | Blob> {
    const isNode = typeof window === "undefined";

    const response = await this.ussp.request<any>("/api/files/download", {
      method: "GET",
      params: {
        namespaceId: namespaceId.toString(),
        path,
      },
    });

    if (isNode) {
      return response;
    } else {
      return new Blob([response]);
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
