# USSP (Universal Secure Storage Platform) - SDK Documentation

## 概要

USSP SDKは、JavaScriptアプリケーションからUSSPストレージサーバーへのシンプルで安全なアクセスを提供します。OAuth 2.0とPKCEを使用した認可により、バックエンド無しのSPAからも安全にファイルをアップロード・ダウンロードできます。

## インストール

```bash
npm install ussp-sdk
# または
yarn add ussp-sdk
```

## 基本的な使用方法

### 1. 初期化

```javascript
import USSP from 'ussp-sdk';

// ストレージサーバーのURLを設定
USSP.config.url('https://storage.example.com');

// クライアント情報で初期化
await USSP.init({
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback'
});
```

### 2. OAuth認証フロー

```javascript
// 1. 認可画面へリダイレクト
const authUrl = USSP.getAuthorizationUrl({
  state: 'random-string',
  scope: 'read write'
});
window.location.href = authUrl;

// 2. コールバックページでコードを処理
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const codeVerifier = sessionStorage.getItem('codeVerifier');

// 3. トークンを取得
const { accessToken, refreshToken } = await USSP.exchangeCode(code, codeVerifier);
sessionStorage.setItem('accessToken', accessToken);
```

### 3. ファイルアップロード

```javascript
// ファイルをアップロード
const file = new File(['content'], 'example.txt', { type: 'text/plain' });

const result = await USSP.upload({
  namespaceId: 1,
  path: 'documents/example.txt',
  file: file,
  accessToken: sessionStorage.getItem('accessToken')
});

console.log('Upload successful:', result);
// {
//   path: 'documents/example.txt',
//   size: 7,
//   mimeType: 'text/plain',
//   etag: 'abc123def456'
// }
```

### 4. ファイルダウンロード

```javascript
// ファイルをダウンロード
const blob = await USSP.download({
  namespaceId: 1,
  path: 'documents/example.txt',
  accessToken: sessionStorage.getItem('accessToken')
});

// ブラウザから保存
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'example.txt';
a.click();
```

### 5. バックアップ作成

```javascript
// ファイルのバックアップジョブを作成
const backupJob = await USSP.createBackup({
  fileId: 1,
  sourceAdapterId: 1,      // ローカルストレージ
  targetAdapterId: 2,      // S3バックアップ
  accessToken: sessionStorage.getItem('accessToken')
});

console.log('Backup job created:', backupJob.id);
```

### 6. バックアップステータス確認

```javascript
// バックアップジョブのステータスを確認
const jobs = await USSP.getBackupStatus({
  status: 'pending', // 'pending' | 'in_progress' | 'completed' | 'failed'
  accessToken: sessionStorage.getItem('accessToken')
});

jobs.forEach(job => {
  console.log(`Job ${job.id}: ${job.status}`);
});
```

## 高度な使用方法

### カスタムネームスペース

```javascript
// 複数のネームスペースを管理
const publicNs = 1;  // 公開アセット
const privatNs = 2; // プライベートファイル

// 公開アセットをアップロード
await USSP.upload({
  namespaceId: publicNs,
  path: 'assets/logo.png',
  file: logoFile
});

// プライベートファイルをアップロード
await USSP.upload({
  namespaceId: privatNs,
  path: 'private/invoice.pdf',
  file: invoiceFile
});
```

### エラーハンドリング

```javascript
try {
  const result = await USSP.upload({
    namespaceId: 1,
    path: 'documents/large-file.zip',
    file: largeFile,
    accessToken: sessionStorage.getItem('accessToken')
  });
} catch (error) {
  if (error.status === 401) {
    // トークンが無効 - 再認証が必要
    console.error('Authentication failed');
    sessionStorage.clear();
    window.location.href = USSP.getAuthorizationUrl();
  } else if (error.status === 413) {
    // ファイルサイズが大きすぎる
    console.error('File is too large');
  } else {
    console.error('Upload failed:', error.message);
  }
}
```

### プログレス追跡

```javascript
// アップロード進捗を追跡
const result = await USSP.upload({
  namespaceId: 1,
  path: 'videos/movie.mp4',
  file: videoFile,
  accessToken: sessionStorage.getItem('accessToken'),
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress.loaded}/${progress.total} bytes`);
    updateProgressBar(progress.loaded / progress.total);
  }
});
```

## React Integration Example

```javascript
import { useEffect, useState } from 'react';
import USSP from 'ussp-sdk';

function StorageApp() {
  const [accessToken, setAccessToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // OAuth コールバック処理
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      const codeVerifier = sessionStorage.getItem('codeVerifier');
      USSP.exchangeCode(code, codeVerifier)
        .then(({ accessToken }) => {
          setAccessToken(accessToken);
          setIsAuthenticated(true);
          sessionStorage.setItem('accessToken', accessToken);
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, []);

  const handleLogin = () => {
    const authUrl = USSP.getAuthorizationUrl({
      state: Math.random().toString(36),
      scope: 'read write'
    });
    window.location.href = authUrl;
  };

  const handleUpload = async (file) => {
    try {
      const result = await USSP.upload({
        namespaceId: 1,
        path: `uploads/${file.name}`,
        file,
        accessToken
      });
      console.log('Upload successful:', result);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  if (!isAuthenticated) {
    return <button onClick={handleLogin}>ログイン</button>;
  }

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => handleUpload(e.target.files[0])} 
      />
    </div>
  );
}
```

## API リファレンス

### `USSP.config.url(url: string)`

ストレージサーバーのベースURLを設定します。

```javascript
USSP.config.url('https://storage.example.com');
```

### `USSP.init(options: InitOptions)`

SDKを初期化します。

```javascript
interface InitOptions {
  clientId: string;        // OAuth クライアントID
  redirectUri: string;     // OAuth リダイレクトURI
  scope?: string;          // OAuth スコープ (デフォルト: 'read write')
}
```

### `USSP.getAuthorizationUrl(options: AuthOptions): string`

OAuth認可URLを生成します。

```javascript
interface AuthOptions {
  state?: string;          // CSRF保護用state
  scope?: string;          // OAuth スコープ
}
```

### `USSP.exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse>`

認可コードをアクセストークンに交換します。

```javascript
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

### `USSP.upload(options: UploadOptions): Promise<FileInfo>`

ファイルをアップロードします。

```javascript
interface UploadOptions {
  namespaceId: number;
  path: string;
  file: File | Blob;
  accessToken: string;
  onProgress?: (progress: ProgressEvent) => void;
}

interface FileInfo {
  path: string;
  size: number;
  mimeType: string;
  etag: string;
}
```

### `USSP.download(options: DownloadOptions): Promise<Blob>`

ファイルをダウンロードします。

```javascript
interface DownloadOptions {
  namespaceId: number;
  path: string;
  accessToken: string;
}
```

### `USSP.createBackup(options: BackupOptions): Promise<BackupJob>`

バックアップジョブを作成します。

```javascript
interface BackupOptions {
  fileId: number;
  sourceAdapterId: number;
  targetAdapterId: number;
  accessToken: string;
}

interface BackupJob {
  id: number;
  fileId: number;
  sourceAdapterId: number;
  targetAdapterId: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}
```

### `USSP.getBackupStatus(options: BackupStatusOptions): Promise<BackupJob[]>`

バックアップジョブのステータスを取得します。

```javascript
interface BackupStatusOptions {
  status?: string;         // フィルタリング用ステータス
  accessToken: string;
}
```

## セキュリティベストプラクティス

### 1. PKCE (Proof Key for Code Exchange)
- SDKは自動的にPKCEを使用します
- `code_verifier`と`code_challenge`は安全に管理されます

### 2. トークン管理
```javascript
// ✅ 良い例: sessionStorageにトークンを保存（ウィンドウ閉鎖時削除）
sessionStorage.setItem('accessToken', accessToken);

// ❌ 悪い例: localStorageに機密トークンを保存
// localStorage.setItem('accessToken', accessToken); // XSS攻撃に脆弱

// ✅ 良い例: メモリ内に保存
const [accessToken, setAccessToken] = useState(null);
```

### 3. CORS設定
- サーバーは信頼できたOriginからのみリクエストを受け付けるべきです
- 環境変数で許可するOriginを設定します

```javascript
// サーバー側 (.env.local)
ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com
```

### 4. 権限の最小化
```javascript
// スコープを最小限に
const result = await USSP.exchangeCode(code, codeVerifier, {
  scope: 'read' // 読み取り専用
});
```

## トラブルシューティング

### 401 Unauthorized
- アクセストークンが無効または期限切れ
- 再認証が必要

```javascript
try {
  await USSP.upload({ ... });
} catch (error) {
  if (error.status === 401) {
    // 再認証フローを開始
    const authUrl = USSP.getAuthorizationUrl();
    window.location.href = authUrl;
  }
}
```

### CORS エラー
- サーバーのCORS設定を確認
- `Allow-Origin`ヘッダーが正しく設定されているか確認

### ネットワークエラー
```javascript
async function uploadWithRetry(options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await USSP.upload(options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## ライセンス

MIT License

## サポート

問題や質問がある場合は、GitHubのIssueを作成してください。
