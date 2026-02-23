# USSP SDK ブラウザ利用ガイド

USSP SDK はブラウザをメインの使用環境として設計されています。このガイドでは、Web アプリケーションから USSP SDK を使用するための具体的な手順を説明します。

## 環境要件

- **ブラウザ対応**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **CORS 設定**: USSP サーバーが CORS ヘッダーを正しく設定していること
- **OAuth 設定**: USSP サーバーで OAuth クライアントが登録されていること

## インストール

### npm/yarn/pnpm を使用

```bash
npm install @ussp/sdk
# または
yarn add @ussp/sdk
# または
pnpm add @ussp/sdk
```

### CDN 経由（グローバルスクリプト）

```html
<script src="https://cdn.jsdelivr.net/npm/@ussp/sdk@latest/dist/index.js"></script>
<script>
  const ussp = new window.USSP({
    serverUrl: 'https://api.ussp.example.com',
    clientId: 'your-client-id',
  });
</script>
```

## セットアップ手順

### 1. SDK の初期化

```typescript
import USSP from '@ussp/sdk';

// SDK インスタンスを作成
const ussp = new USSP({
  serverUrl: process.env.REACT_APP_USSP_SERVER || 'https://api.ussp.example.com',
  clientId: process.env.REACT_APP_USSP_CLIENT_ID,
});
```

### 2. 環境変数の設定

`.env.local` ファイルに以下を追加：

```env
REACT_APP_USSP_SERVER=https://api.ussp.example.com
REACT_APP_USSP_CLIENT_ID=your-client-id-here
```

### 3. OAuth 認証フロー

#### ステップ 1: OAuth ポップアップで認可

```typescript
async function handleLogin() {
  try {
    const token = await ussp.oauth.authorize({
      redirectUri: window.location.origin + '/callback',
    });

    // トークンを保存
    localStorage.setItem('ussp_access_token', token.accessToken);
    if (token.refreshToken) {
      localStorage.setItem('ussp_refresh_token', token.refreshToken);
    }

    // SDK にトークンを設定
    ussp.setAccessToken(token.accessToken);

    console.log('ログイン成功');
  } catch (err) {
    console.error('ログイン失敗:', err);
  }
}
```

#### ステップ 2: OAuth コールバック処理

```typescript
// /callback ページで以下を実行
async function handleOAuthCallback() {
  try {
    // URL から authorization code を取得
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code) {
      throw new Error('Authorization code not found');
    }

    // コードをトークンと交換
    const token = await ussp.oauth.exchangeCode(code);

    // トークンを保存
    localStorage.setItem('ussp_access_token', token.accessToken);
    if (token.refreshToken) {
      localStorage.setItem('ussp_refresh_token', token.refreshToken);
    }

    // SDK にトークンを設定
    ussp.setAccessToken(token.accessToken);

    // リダイレクト
    window.location.href = '/';
  } catch (err) {
    console.error('OAuth コールバック失敗:', err);
  }
}

// ページロード時に呼び出し
if (window.location.pathname === '/callback') {
  handleOAuthCallback();
}
```

### 4. トークンの復元とセッション管理

```typescript
// アプリ起動時にトークンを復元
function initializeSession() {
  const token = localStorage.getItem('ussp_access_token');
  if (token) {
    ussp.setAccessToken(token);
  }
}

// ページロード時に実行
initializeSession();

// トークンリフレッシュ（有効期限前）
async function refreshAccessToken() {
  try {
    const refreshToken = localStorage.getItem('ussp_refresh_token');
    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    const newToken = await ussp.oauth.refreshToken(refreshToken);
    localStorage.setItem('ussp_access_token', newToken.accessToken);
    ussp.setAccessToken(newToken.accessToken);
  } catch (err) {
    console.error('トークンリフレッシュ失敗:', err);
    // ログアウト処理
    logout();
  }
}

// ログアウト
async function logout() {
  try {
    await ussp.oauth.revokeToken();
    localStorage.removeItem('ussp_access_token');
    localStorage.removeItem('ussp_refresh_token');
    window.location.href = '/';
  } catch (err) {
    console.error('ログアウト失敗:', err);
  }
}
```

## 使用例

### ファイルのアップロード

```typescript
async function uploadFile(file: File, namespaceId: number) {
  try {
    const fileInfo = await ussp.files.upload({
      namespaceId,
      path: file.name,
      data: await file.arrayBuffer(),
      mimeType: file.type,
    });

    console.log('ファイルアップロード成功:', fileInfo);
    return fileInfo;
  } catch (err) {
    console.error('ファイルアップロード失敗:', err);
  }
}

// HTML input から
document.getElementById('file-input')?.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    await uploadFile(file, 1); // namespace ID 1
  }
});
```

### ファイルのダウンロード

```typescript
async function downloadFile(namespaceId: number, path: string) {
  try {
    const data = await ussp.files.download(namespaceId, path);

    // ブラウザでダウンロード
    const blob = new Blob([data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || 'download';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('ファイルダウンロード失敗:', err);
  }
}
```

### ファイル一覧の取得

```typescript
async function listFiles(namespaceId: number, prefix?: string) {
  try {
    const files = await ussp.files.list({
      namespaceId,
      prefix,
    });

    console.log('ファイル一覧:', files);
    return files;
  } catch (err) {
    console.error('ファイル一覧取得失敗:', err);
  }
}
```

### バックアップの作成

```typescript
async function createBackup(fileId: number, sourceId: number, targetId: number) {
  try {
    const job = await ussp.backup.create({
      fileId,
      sourceAdapterId: sourceId,
      targetAdapterId: targetId,
    });

    console.log('バックアップジョブ作成:', job);

    // ジョブの完了を監視
    const completed = await ussp.backup.watch(job.id, (updatedJob) => {
      console.log(`バックアップ進行状況: ${updatedJob.status}`);
    });

    console.log('バックアップ完了:', completed);
  } catch (err) {
    console.error('バックアップ失敗:', err);
  }
}
```

## React 統体例

### カスタムフック

```typescript
import { useEffect, useState } from 'react';

function useUSS() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 保存されたトークンを復元
    const savedToken = localStorage.getItem('ussp_access_token');
    if (savedToken) {
      ussp.setAccessToken(savedToken);
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  const login = async (redirectUri: string) => {
    try {
      const result = await ussp.oauth.authorize({ redirectUri });
      localStorage.setItem('ussp_access_token', result.accessToken);
      ussp.setAccessToken(result.accessToken);
      setToken(result.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  };

  const logout = async () => {
    try {
      await ussp.oauth.revokeToken();
      localStorage.removeItem('ussp_access_token');
      setToken(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  };

  return { token, loading, error, login, logout, ussp };
}

export default useUSS;
```

### コンポーネント例

```typescript
import React, { useState } from 'react';
import useUSS from './hooks/useUSS';

export function FileUploadComponent() {
  const { token, login, ussp } = useUSS();
  const [uploading, setUploading] = useState(false);

  if (!token) {
    return (
      <button onClick={() => login(window.location.origin + '/callback')}>
        ログイン
      </button>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setUploading(true);
    try {
      const result = await ussp.files.upload({
        namespaceId: 1,
        path: file.name,
        data: await file.arrayBuffer(),
        mimeType: file.type,
      });
      alert(`ファイルアップロード成功: ${result.path}`);
    } catch (err) {
      alert(`アップロード失敗: ${err}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p>アップロード中...</p>}
    </div>
  );
}
```

## エラー処理とデバッグ

### エラーハンドリング

```typescript
async function safeRequest<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[${context}] エラー:`, err);

    if (err instanceof Error) {
      if (err.message.includes('401')) {
        // トークン無効 - ログアウト処理
        localStorage.removeItem('ussp_access_token');
        window.location.href = '/login';
        return null;
      }

      if (err.message.includes('403')) {
        // アクセス権限なし
        alert('このファイルにアクセスする権限がありません');
        return null;
      }

      if (err.message.includes('CORS')) {
        // CORS エラー
        console.error('CORS エラー - サーバーの CORS 設定を確認してください');
      }
    }

    throw err;
  }
}
```

### デバッグモード

```typescript
// SDK のデバッグモード有効化
if (process.env.NODE_ENV === 'development') {
  window.ussDebug = true;
  console.log('[USSP] デバッグモード有効');
}
```

## CORS 設定

USSP サーバーが CORS を正しく設定していることを確認してください：

```typescript
// server/index.ts または同等の設定
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://yourapp.example.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
```

## パフォーマンス最適化

### トークン有効期限管理

```typescript
function startTokenRefreshTimer(expiresIn: number) {
  // 有効期限の 5 分前にリフレッシュ
  const refreshTime = (expiresIn - 300) * 1000;

  setTimeout(async () => {
    try {
      await refreshAccessToken();
    } catch (err) {
      console.error('自動リフレッシュ失敗:', err);
    }
  }, refreshTime);
}
```

### リクエストのキャッシング

```typescript
const fileCache = new Map<string, { data: any; timestamp: number }>();

async function getCachedFile(
  namespaceId: number,
  path: string,
  cacheTTL = 5 * 60 * 1000 // 5 分
) {
  const key = `${namespaceId}:${path}`;
  const cached = fileCache.get(key);

  if (cached && Date.now() - cached.timestamp < cacheTTL) {
    return cached.data;
  }

  const data = await ussp.files.download(namespaceId, path);
  fileCache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

## トラブルシューティング

### CORS エラー

**症状**: `Access to XMLHttpRequest has been blocked by CORS policy`

**解決策**: 
1. USSP サーバーの CORS 設定を確認
2. サーバーが `Authorization` ヘッダーを許可しているか確認
3. ブラウザのコンソールでエラーメッセージを確認

### トークン有効期限エラー

**症状**: `401 Unauthorized`

**解決策**:
1. トークンの有効期限を確認
2. リフレッシュトークンでトークンを更新
3. 必要に応じて再ログイン

### ファイルアップロード失敗

**症状**: `Upload failed: Request timeout`

**解決策**:
1. ファイルサイズを確認（大きすぎないか）
2. ネットワーク接続を確認
3. サーバーのリソース状況を確認

## まとめ

USSP SDK はブラウザでのストレージ操作を簡単にしており、OAuth 認証、ファイル管理、バックアップなど必要な機能がすべて備わっています。本ガイドを参考に、Web アプリケーションに統合してください。
