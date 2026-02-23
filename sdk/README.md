# USSP JavaScript SDK

USSP（分散対応ストレージ基盤）のJavaScript/TypeScript SDKです。**ブラウザをメイン環境として設計**されており、Web アプリケーションから直接 USSP サーバーに接続できます。

## 主な特徴

- **ブラウザ主体設計**: Web アプリケーションでの使用を前提に実装
- **Node.js 互換**: 同じコードで Node.js 環境でも動作
- **OAuth2 PKCE フロー対応**: セキュアな認証を実装
- **マルチバックエンド対応**: Local、S3、Google Drive 等に対応
- **TypeScript 完全対応**: 型安全な開発が可能

## インストール

```bash
npm install @ussp/sdk
```

## クイックスタート

```typescript
import USSP from '@ussp/sdk';

// SDKを初期化
const ussp = new USSP({
  serverUrl: 'https://api.ussp.example.com',
  clientId: 'your-client-id',
});

// OAuth認証
const token = await ussp.oauth.authorize({
  redirectUri: 'https://yourapp.example.com/callback',
});

// ファイルをアップロード
const fileInfo = await ussp.files.upload({
  namespaceId: 1,
  path: 'documents/report.pdf',
  data: pdfBuffer,
  mimeType: 'application/pdf',
});

// ファイルをダウンロード
const data = await ussp.files.download(1, 'documents/report.pdf');

// バックアップを作成
const backup = await ussp.backup.create({
  fileId: 1,
  sourceAdapterId: 1,
  targetAdapterId: 2,
});
```

## API ドキュメント

### OAuth 認証

```typescript
// 認可URLを生成
const authorizeUrl = ussp.oauth.generateAuthorizeUrl({
  redirectUri: 'https://yourapp.example.com/callback',
  state: 'optional-state-value',
});

// ポップアップで認可フローを実行
const token = await ussp.oauth.authorize({
  redirectUri: 'https://yourapp.example.com/callback',
});

// トークンをリフレッシュ
const newToken = await ussp.oauth.refreshToken(refreshToken);

// トークンを無効化
await ussp.oauth.revokeToken();
```

### ファイル操作

```typescript
// ファイルをアップロード
const fileInfo = await ussp.files.upload({
  namespaceId: 1,
  path: 'path/to/file.txt',
  data: 'file content',
  mimeType: 'text/plain',
});

// ファイル情報を取得
const info = await ussp.files.getFileInfo(1, 'path/to/file.txt');

// ファイルをダウンロード
const data = await ussp.files.download(1, 'path/to/file.txt');

// ファイルを削除
await ussp.files.delete(1, 'path/to/file.txt');

// ディレクトリをリスト
const files = await ussp.files.list({
  namespaceId: 1,
  prefix: 'documents/',
});

// ファイルを移動/リネーム
await ussp.files.move(1, 'old/path.txt', 'new/path.txt');

// ファイルをコピー
await ussp.files.copy(1, 'source.txt', 'copy.txt');

// ディレクトリを作成
await ussp.files.mkdir(1, 'new-directory/');

// 公開ダウンロードURLを取得
const url = await ussp.files.getPublicDownloadUrl(1, 'file.txt', 3600);
```

### バックアップ

```typescript
// バックアップジョブを作成
const job = await ussp.backup.create({
  fileId: 1,
  sourceAdapterId: 1,
  targetAdapterId: 2,
});

// すべてのジョブを取得
const allJobs = await ussp.backup.getAllJobs();

// ジョブのステータスを取得
const pendingJobs = await ussp.backup.getPendingJobs();
const inProgressJobs = await ussp.backup.getInProgressJobs();
const completedJobs = await ussp.backup.getCompletedJobs();
const failedJobs = await ussp.backup.getFailedJobs();

// バックアップを監視
const finalJob = await ussp.backup.watch(jobId, (job) => {
  console.log(`Job ${job.id}: ${job.status}`);
});

// 統計を取得
const stats = await ussp.backup.getStatistics();
```

### 管理機能

```typescript
// ユーザーを管理
const user = await ussp.admin.createUser({
  username: 'newuser',
  email: 'user@example.com',
  password: 'secure-password',
  role: 'user',
});

const users = await ussp.admin.getUsers();
await ussp.admin.updateUser(userId, { role: 'admin' });
await ussp.admin.deleteUser(userId);

// 名前空間を管理
const ns = await ussp.admin.createNamespace({
  name: 'my-namespace',
  storageAdapterId: 1,
  ownerId: 1,
});

const namespaces = await ussp.admin.getNamespaces();
await ussp.admin.updateNamespace(nsId, { name: 'updated-name' });

// ストレージアダプターを管理
const adapter = await ussp.admin.createAdapter({
  name: 'S3 Bucket',
  type: 's3',
  config: {
    region: 'us-east-1',
    bucket: 'my-bucket',
    accessKeyId: '...',
    secretAccessKey: '...',
  },
});

const adapters = await ussp.admin.getAdapters();
const isConnected = await ussp.admin.testAdapterConnection(adapterId);

// OAuthクライアントを管理
const oauthClient = await ussp.admin.createOAuthClient({
  name: 'My App',
  redirectUris: ['https://myapp.example.com/callback'],
});

const clients = await ussp.admin.getOAuthClients();

// システム統計
const stats = await ussp.admin.getSystemStats();
const health = await ussp.admin.healthCheck();
```

## ブラウザサポート

USSP SDK はすべての最新ブラウザで動作します：

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### ブラウザでの使用方法

詳細な セットアップ手順と使用例については、[BROWSER_SDK_SETUP.md](./BROWSER_SDK_SETUP.md) を参照してください。

```html
<!-- CDN から読み込み -->
<script src="https://cdn.jsdelivr.net/npm/@ussp/sdk@latest/dist/index.js"></script>

<script>
  // SDK インスタンスを作成（環境変数は本番環境に応じて設定）
  const ussp = new window.USSP({
    serverUrl: 'https://api.ussp.example.com',
    clientId: 'your-client-id',
  });

  // OAuth ポップアップで認可
  async function login() {
    try {
      const token = await ussp.oauth.authorize({
        redirectUri: window.location.origin + '/callback',
      });
      localStorage.setItem('ussp_token', token.accessToken);
      ussp.setAccessToken(token.accessToken);
    } catch (error) {
      console.error('ログイン失敗:', error);
    }
  }
</script>
```

### React での使用

```typescript
import USSP from '@ussp/sdk';
import { useEffect, useState } from 'react';

export function FileUpload() {
  const [ussp] = useState(() => new USSP({
    serverUrl: process.env.REACT_APP_USSP_SERVER,
    clientId: process.env.REACT_APP_USSP_CLIENT_ID,
  }));

  return (
    <input
      type="file"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const result = await ussp.files.upload({
            namespaceId: 1,
            path: file.name,
            data: await file.arrayBuffer(),
            mimeType: file.type,
          });
          console.log('アップロード完了:', result);
        }
      }}
    />
  );
}
```

## 環境別の動作確認

SDK は以下の環境で検証済みです：

- **ブラウザ環境**: HTTP リクエストに `fetch` API を使用
- **Node.js 環境**: `http`/`https` モジュールを使用
- **両環境での自動切り替え**: `typeof window` で環境を判定

## ライセンス

MIT
