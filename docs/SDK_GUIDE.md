# USSP JavaScript SDK - 統合ガイド

## 概要

USSP JavaScript SDKは、Web アプリケーションからセキュアにUSPS サーバーにアクセスするためのライブラリです。OAuth2.0フロー、PKCE認証、ファイル操作を簡潔に扱えます。

---

## インストール

```bash
npm install ussp-sdk
# または
yarn add ussp-sdk
# または
pnpm add ussp-sdk
```

---

## クイックスタート

### 1. 初期化

```javascript
import { USSP } from 'ussp-sdk';

// サーバーURL設定
USSP.config.url('https://storage.example.com');

// 初期化（クライアント情報を登録）
await USSP.init({
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com/callback'
});
```

### 2. ログイン（OAuth フロー）

```javascript
// ユーザーをログインページにリダイレクト
USSP.auth.login();

// コールバックページで処理
// https://yourapp.com/callback?code=...&state=...
```

### 3. コールバック処理

```javascript
// コールバックページ (pages/callback.js)
import { USSP } from 'ussp-sdk';

async function handleCallback() {
  try {
    // URL のクエリパラメータから認可コードを取得
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (!code) {
      throw new Error('No authorization code');
    }

    // トークンを交換
    const token = await USSP.auth.exchangeCode(code);
    
    // ローカルストレージに保存（またはセッションストレージ）
    localStorage.setItem('ussp_token', token.access_token);
    
    // ホームページにリダイレクト
    window.location.href = '/';
  } catch (error) {
    console.error('Callback error:', error);
  }
}

handleCallback();
```

### 4. ファイルアップロード

```javascript
// ファイルアップロード
const file = document.getElementById('file-input').files[0];
const namespaceId = 1; // 事前に作成したnamespace

const result = await USSP.files.upload({
  namespaceId,
  path: `uploads/${file.name}`,
  file: file  // File または Blob
});

console.log('Upload complete:', result);
// {
//   path: "uploads/document.pdf",
//   size: 1024000,
//   mimeType: "application/pdf",
//   etag: "abc123def456"
// }
```

### 5. ファイルダウンロード

```javascript
// ファイルダウンロード
const data = await USSP.files.download({
  namespaceId: 1,
  path: 'uploads/document.pdf'
});

// BlobからURLを作成
const url = URL.createObjectURL(data);
const a = document.createElement('a');
a.href = url;
a.download = 'document.pdf';
a.click();
URL.revokeObjectURL(url);
```

### 6. ファイル削除

```javascript
await USSP.files.delete({
  namespaceId: 1,
  path: 'uploads/document.pdf'
});
```

---

## API リファレンス

### USSP.config

#### `config.url(baseUrl: string): void`
サーバーのベースURLを設定します。

```javascript
USSP.config.url('https://storage.example.com');
```

---

### USSP.auth

#### `auth.login(): void`
OAuth ログインフローを開始します。

```javascript
// ユーザーをOAuth認可画面にリダイレクト
USSP.auth.login();
```

#### `auth.exchangeCode(code: string): Promise<Token>`
認可コードをアクセストークンに交換します。

```javascript
const token = await USSP.auth.exchangeCode(code);
// {
//   access_token: "eyJ...",
//   refresh_token: "...",
//   token_type: "Bearer",
//   expires_in: 3600
// }
```

#### `auth.logout(): void`
ログアウト処理（ローカルトークン削除）

```javascript
USSP.auth.logout();
```

#### `auth.isAuthenticated(): boolean`
現在のユーザーが認証済みかチェック

```javascript
if (USSP.auth.isAuthenticated()) {
  // 認証済み処理
}
```

#### `auth.getToken(): string | null`
現在のアクセストークンを取得

```javascript
const token = USSP.auth.getToken();
```

---

### USSP.files

#### `files.upload(options: UploadOptions): Promise<FileInfo>`
ファイルをアップロード

```javascript
interface UploadOptions {
  namespaceId: number;
  path: string;  // "uploads/document.pdf"
  file: File | Blob;
}

interface FileInfo {
  path: string;
  size: number;
  mimeType: string;
  etag: string;
}

const result = await USSP.files.upload({
  namespaceId: 1,
  path: 'documents/report.pdf',
  file: fileObject
});
```

#### `files.download(options: DownloadOptions): Promise<Blob>`
ファイルをダウンロード

```javascript
interface DownloadOptions {
  namespaceId: number;
  path: string;
}

const blob = await USSP.files.download({
  namespaceId: 1,
  path: 'documents/report.pdf'
});
```

#### `files.delete(options: DeleteOptions): Promise<void>`
ファイルを削除

```javascript
interface DeleteOptions {
  namespaceId: number;
  path: string;
}

await USSP.files.delete({
  namespaceId: 1,
  path: 'documents/report.pdf'
});
```

#### `files.list(namespaceId: number): Promise<FileInfo[]>`
Namespace内のファイル一覧を取得

```javascript
const files = await USSP.files.list(1);
```

---

### USSP.namespaces

#### `namespaces.list(): Promise<Namespace[]>`
Namespace一覧を取得

```javascript
const namespaces = await USSP.namespaces.list();
// [
//   { id: 1, name: "my-app-files", quotaBytes: 1073741824 },
//   { id: 2, name: "user-uploads", quotaBytes: 5368709120 }
// ]
```

#### `namespaces.info(id: number): Promise<NamespaceInfo>`
Namespaceの詳細情報を取得

```javascript
const info = await USSP.namespaces.info(1);
// {
//   id: 1,
//   name: "my-app-files",
//   quotaBytes: 1073741824,
//   usedBytes: 536870912,
//   fileCount: 42
// }
```

---

## 認証フローの詳細

### PKCE（Proof Key for Public Clients）

SDKは自動的にPKCE フローを実装します：

```javascript
// 内部で以下が自動実行される：
// 1. code_verifier を生成（ランダム64文字）
// 2. code_challenge を計算（SHA256(code_verifier)）
// 3. /oauth/authorize にリダイレクト
// 4. code_verifier をセッションストレージに保存
// 5. コールバック時に code_verifier を使用してトークン交換
```

### トークンの管理

```javascript
// トークンはローカルストレージに自動保存
// SDKは自動でリクエストヘッダに付与

// カスタムストレージを使用したい場合：
USSP.config.setTokenStorage({
  getToken: () => sessionStorage.getItem('token'),
  setToken: (token) => sessionStorage.setItem('token', token),
  removeToken: () => sessionStorage.removeItem('token')
});
```

---

## エラーハンドリング

```javascript
try {
  const file = await USSP.files.download({
    namespaceId: 1,
    path: 'missing.pdf'
  });
} catch (error) {
  if (error.status === 404) {
    console.error('File not found');
  } else if (error.status === 401) {
    console.error('Unauthorized - please login');
    USSP.auth.login();
  } else if (error.status === 429) {
    console.error('Rate limited');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

---

## 使用例：React アプリケーション

### pages/app.jsx

```jsx
import React, { useEffect, useState } from 'react';
import { USSP } from 'ussp-sdk';

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 初期化
    USSP.config.url('https://storage.example.com');
    USSP.init({ clientId: 'your-id', redirectUri: window.location.origin + '/callback' });
    
    // 認証チェック
    if (USSP.auth.isAuthenticated()) {
      setIsAuth(true);
      loadFiles();
    }
  }, []);

  async function loadFiles() {
    try {
      setLoading(true);
      const fileList = await USSP.files.list(1);
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      await USSP.files.upload({
        namespaceId: 1,
        path: `uploads/${file.name}`,
        file
      });
      await loadFiles();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!isAuth) {
    return (
      <div>
        <h1>USSP Storage</h1>
        <button onClick={() => USSP.auth.login()}>
          Sign in with USSP
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>My Files</h1>
      <input
        type="file"
        onChange={handleUpload}
        disabled={loading}
      />
      
      {loading && <p>Loading...</p>}
      
      <ul>
        {files.map(file => (
          <li key={file.path}>
            {file.path} ({file.size} bytes)
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### pages/callback.jsx

```jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { USSP } from 'ussp-sdk';

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        
        if (!code) {
          throw new Error('No authorization code');
        }

        await USSP.auth.exchangeCode(code);
        navigate('/app');
      } catch (error) {
        console.error('Callback failed:', error);
        navigate('/');
      }
    }

    handleCallback();
  }, [navigate]);

  return <p>Authenticating...</p>;
}
```

---

## トラブルシューティング

### Q: "Invalid code_challenge" エラーが出る

A: PKCE フローが正しく動作していません。SDKのバージョンを確認し、サーバーが PKCE をサポートしているか確認してください。

### Q: CORS エラーが出る

A: サーバー設定で CORS を有効にしてください：

```javascript
// server/index.ts
app.use(cors({
  origin: 'https://yourapp.com',
  credentials: true
}));
```

### Q: トークンが期限切れになった

A: リフレッシュトークンで新しいアクセストークンを取得してください：

```javascript
const newToken = await USSP.auth.refresh();
```

---

## ベストプラクティス

1. **トークンの安全な保管**
   - httpOnly Cookie または セッションストレージを使用
   - localStorage は避ける（XSS攻撃に脆弱）

2. **エラーハンドリング**
   - 401 エラーはログイン画面にリダイレクト
   - 429 エラーはリトライロジックを実装

3. **キャッシング**
   - ファイル一覧を定期的に更新
   - SWR または React Query でのキャッシング推奨

4. **セキュリティ**
   - redirectUri は本番環境で固定値に設定
   - 環境変数で clientId を管理
   - HTTPS を強制

---

## サポート

問題が発生した場合、以下をご確認ください：

- [USSP GitHub Issues](https://github.com/yourusername/ussp/issues)
- [FAQ](./FAQ.md)
- [サーバー管理者ガイド](./SERVER_GUIDE.md)
