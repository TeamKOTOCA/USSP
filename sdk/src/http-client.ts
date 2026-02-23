/**
 * Node.js/ブラウザ両対応のHTTPクライアント
 */

export interface HttpResponse<T> {
  status: number;
  ok: boolean;
  data?: T;
  error?: any;
  headers: Record<string, string>;
}

export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, any>;
  timeout?: number;
}

// ブラウザ環境かNode.js環境かを判定
const isNode = typeof window === "undefined";

/**
 * Node.js環境用HTTPクライアント
 */
async function nodeHttpRequest<T>(
  url: string,
  options: HttpRequestOptions
): Promise<HttpResponse<T>> {
  try {
    const http = await import("http");
    const https = await import("https");
    const urlModule = await import("url");

    const parsedUrl = new urlModule.URL(url);
    const protocol = parsedUrl.protocol === "https:" ? https : http;

    const requestOptions = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      timeout: options.timeout || 30000,
    };

    // URLにクエリパラメータを追加
    if (options.params && Object.keys(options.params).length > 0) {
      const query = new URLSearchParams(options.params);
      parsedUrl.search = query.toString();
    }

    return new Promise((resolve, reject) => {
      const req = protocol.request(parsedUrl.toString(), requestOptions, (res) => {
        let body = "";

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          try {
            const data = body ? JSON.parse(body) : null;
            resolve({
              status: res.statusCode || 500,
              ok: (res.statusCode || 500) < 400,
              data,
              headers: res.headers as Record<string, string>,
            });
          } catch (e) {
            resolve({
              status: res.statusCode || 500,
              ok: (res.statusCode || 500) < 400,
              data: body,
              headers: res.headers as Record<string, string>,
            });
          }
        });
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      if (options.data) {
        req.write(JSON.stringify(options.data));
      }

      req.end();
    });
  } catch (err) {
    throw err;
  }
}

/**
 * ブラウザ環境用HTTPクライアント
 */
async function browserHttpRequest<T>(
  url: string,
  options: HttpRequestOptions
): Promise<HttpResponse<T>> {
  const urlObj = new URL(url);

  // クエリパラメータを追加
  if (options.params && Object.keys(options.params).length > 0) {
    Object.entries(options.params).forEach(([key, value]) => {
      urlObj.searchParams.append(key, String(value));
    });
  }

  const fetchOptions: RequestInit = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  if (options.data) {
    fetchOptions.body = JSON.stringify(options.data);
  }

  const response = await fetch(urlObj.toString(), fetchOptions);

  let data: T | undefined;
  try {
    data = await response.json();
  } catch {
    // JSONパースに失敗した場合は無視
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
    headers: Object.fromEntries(response.headers.entries()),
  };
}

/**
 * 環境別HTTPクライアント
 */
export async function httpRequest<T>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<HttpResponse<T>> {
  if (isNode) {
    return nodeHttpRequest<T>(url, options);
  } else {
    return browserHttpRequest<T>(url, options);
  }
}

/**
 * FormData互換ラッパー
 */
export class CompatibleFormData {
  private browser: FormData | null = null;
  private node: Map<string, any> = new Map();

  constructor() {
    if (!isNode && typeof FormData !== "undefined") {
      this.browser = new FormData();
    }
  }

  append(key: string, value: any): void {
    if (this.browser) {
      this.browser.append(key, value);
    } else {
      this.node.set(key, value);
    }
  }

  getFormData(): FormData | Map<string, any> {
    if (this.browser) {
      return this.browser;
    }
    return this.node;
  }

  isNode(): boolean {
    return !this.browser;
  }
}
