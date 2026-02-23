# USSP - AI実装者向け技術仕様書

このドキュメントはAIアシスタント（Claude, ChatGPT等）が機能実装を行う際のリファレンスです。

---

## 目次

1. [プロジェクト構成](#プロジェクト構成)
2. [実装済み機能](#実装済み機能)
3. [未実装機能](#未実装機能)
4. [実装上の注意](#実装上の注意)
5. [コーディング規約](#コーディング規約)
6. [テスト戦略](#テスト戦略)

---

## プロジェクト構成

```
ussp/
├── server/                 # Express バックエンド
│   ├── index.ts           # エントリーポイント
│   ├── db.ts              # Drizzle ORM設定（SQLite/PostgreSQL対応）
│   ├── routes.ts          # ルート定義
│   ├── storage.ts         # ストレージ抽象化レイヤー
│   ├── oauth.ts           # OAuth2.0実装
│   ├── file-handler.ts    # ファイル操作
│   ├── backup-queue.ts    # バックアップ処理
│   ├── user-management.ts # ユーザー管理
│   ├── static.ts          # 静的ファイル配信
│   └── vite.ts            # Viteビルド
├── client/                 # React フロントエンド
│   ├── src/
│   │   ├── pages/         # ページコンポーネント
│   │   ├── hooks/         # カスタムフック
│   │   └── lib/           # ユーティリティ
│   └── vite.config.ts
├── shared/                 # 共有コード
│   ├── schema.ts          # Drizzle スキーマ定義
│   └── routes.ts          # API ルート定義
├── scripts/
│   └── setup-local.ts     # セットアップスクリプト
├── docs/                  # ドキュメント
│   ├── SPECIFICATION.md   # 仕様書
│   ├── SDK_GUIDE.md      # SDK使用ガイド
│   ├── SERVER_GUIDE.md   # サーバー管理ガイド
│   └── IMPLEMENTATION_NOTES.md # このファイル
└── package.json
```

---

## 実装済み機能

### 1. データベース層 ✅

**ファイル**: `server/db.ts`

```typescript
// SQLite（開発）と PostgreSQL（本番）の自動切り替え
if (NODE_ENV !== 'production' && !DATABASE_URL) {
  // SQLiteを使用
  db = drizzleSqlite(sqliteDb, { schema });
} else {
  // PostgreSQLを使用
  db = drizzle(pool, { schema });
}
```

**スキーマ** (`shared/schema.ts`):
- `users` - ユーザー情報（role, isActive含む）
- `storageAdapters` - ストレージ設定
- `namespaces` - ファイル名前空間
- `oauthClients` - OAuthクライアント登録
- `oauthTokens` - トークン管理
- `files` - ファイルメタデータ
- `backupQueue` - バックアップジョブ

### 2. OAuth2.0 認証 ✅

**ファイル**: `server/oauth.ts`

実装内容:
- PKCE チャレンジ生成（SHA256）
- 認可コード生成・検証
- JWT アクセストークン生成
- HMAC-SHA256署名

```typescript
// PKCEチャレンジ生成
const { codeVerifier, codeChallenge } = generatePKCEChallenge();

// 認可コード作成
const code = await createAuthorizationCode(clientId, redirectUri, codeChallenge, 'S256');

// トークン交換
const token = await exchangeCodeForToken(code, clientId, codeVerifier);
```

### 3. ファイル操作 ✅

**ファイル**: `server/file-handler.ts`

実装内容:
- Localストレージへのアップロード
- ファイル読み込み
- ETag生成（MD5）
- MIMEタイプ推定

```typescript
const fileInfo = await fileHandler.uploadFile(adapter, filePath, data);
// { path, size, mimeType, etag }

const data = await fileHandler.downloadFile(adapter, filePath);
```

### 4. バックアップキュー ✅

**ファイル**: `server/backup-queue.ts`

実装内容:
- 非同期ジョブ処理
- ステータス管理（pending/in_progress/completed/failed）
- エラーログ記録
- ワーカープロセス

```typescript
const job = await backupProcessor.createBackupJob(fileId, sourceId, targetId);
const jobs = await backupProcessor.getBackupJobs('pending');
```

### 5. ユーザー管理 ✅

**ファイル**: `server/user-management.ts`

実装内容:
- CRUD操作
- パスワードハッシング（bcrypt推奨）
- ロール管理（admin/user）
- 最終ログイン追跡

### 6. ストレージ抽象化 ✅

**ファイル**: `server/storage.ts`

実装内容:
- DatabaseStorage クラス
- アダプター管理
- Namespace管理
- クライアント登録

---

## 未実装機能

### 1. ストレージアダプター拡張

**優先度**: 高

#### S3 Adapter (`server/adapters/s3-adapter.ts`)

```typescript
import AWS from 'aws-sdk';

class S3Adapter {
  async put(path: string, data: Buffer): Promise<void> {
    // S3へアップロード
  }
  
  async get(path: string): Promise<Buffer> {
    // S3から取得
  }
  
  async delete(path: string): Promise<void> {
    // S3から削除
  }
}
```

**必要な機能**:
- AWS SDK統合
- マルチパートアップロード
- S3互換性（MinIO/R2対応）

#### Google Drive Adapter (`server/adapters/gdrive-adapter.ts`)

```typescript
import { google } from 'googleapis';

class GoogleDriveAdapter {
  async authenticate(credentials: any): Promise<void> {
    // OAuth2認証
  }
  
  async put(path: string, data: Buffer): Promise<void> {
    // Google Driveへアップロード
  }
}
```

### 2. JavaScript SDK

**ファイル**: `sdk/index.ts`  
**優先度**: 高

```typescript
// SDK基本構造
export class USSP {
  static config = {
    url(baseUrl: string) { /* ... */ },
  };
  
  static auth = {
    login() { /* ... */ },
    exchangeCode(code: string) { /* ... */ },
    logout() { /* ... */ },
    getToken() { /* ... */ },
  };
  
  static files = {
    upload(options: UploadOptions) { /* ... */ },
    download(options: DownloadOptions) { /* ... */ },
    delete(options: DeleteOptions) { /* ... */ },
    list(namespaceId: number) { /* ... */ },
  };
}
```

**実装要件**:
- PKCE自動実装
- トークン自動保存
- リトライロジック
- TypeScript型定義

### 3. Web管理UI

**ファイル**: `client/src/pages/`  
**優先度**: 中

ページ構成:
- Dashboard (`pages/dashboard.tsx`)
- Adapter管理 (`pages/adapters.tsx`)
- OAuth Client管理 (`pages/oauth-clients.tsx`)
- Namespace管理 (`pages/namespaces.tsx`)
- ユーザー管理 (`pages/users.tsx`)

### 4. リフレッシュトークン機構

**ファイル**: `server/oauth.ts`  
**優先度**: 中

```typescript
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string }> {
  // リフレッシュトークンでアクセストークン再発行
}
```

### 5. クォータ管理

**ファイル**: `server/storage.ts`  
**優先度**: 中

```typescript
async checkQuota(namespaceId: number, fileSize: number): Promise<boolean> {
  // クォータ超過チェック
}
```

---

## 実装上の注意

### 1. ストレージアダプターの実装方針

全アダプターは以下のインターフェースを実装してください：

```typescript
interface StorageAdapter {
  type: 'local' | 's3' | 'gdrive' | 'r2';
  
  // ファイル操作
  put(path: string, data: Buffer | Stream): Promise<void>;
  get(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  
  // メタデータ
  stat(path: string): Promise<{ size: number; etag: string }>;
  list(prefix: string): Promise<string[]>;
  
  // 検証
  validate(config: any): Promise<boolean>;
}
```

**実装例** (`server/adapters/s3-adapter.ts`):

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  
  constructor(config: any) {
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }
  
  async put(path: string, data: Buffer): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: path,
      Body: data,
    }));
  }
  
  async get(path: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: path,
    }));
    return Buffer.from(await response.Body!.transformToByteArray());
  }
}
```

### 2. エラーハンドリング

すべてのAPI呼び出しで以下を返してください：

```typescript
// 成功
{ status: 200, data: {...} }

// エラー
{ status: 400, error: "Invalid input" }
{ status: 401, error: "Unauthorized" }
{ status: 404, error: "Not found" }
{ status: 500, error: "Internal server error" }
```

### 3. 認証・認可

すべての非公開エンドポイント (`/api/*`, `/admin/*`) に以下を実装：

```typescript
// ミドルウェア例
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  const auth = await validateAccessToken(token);
  if (!auth) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = auth;
  next();
}
```

### 4. ロギング

本番環境でのデバッグを容易にするため、以下の形式でログ出力：

```typescript
console.log(`[${new Date().toISOString()}] [ModuleName] ${'INFO|WARN|ERROR'}: message`);

// 例
console.log(`[BackupQueue] INFO: Starting job #1`);
console.error(`[S3Adapter] ERROR: Failed to upload: ${error.message}`);
```

---

## コーディング規約

### TypeScript

```typescript
// ✅ 型指定は明示的に
async function uploadFile(
  namespaceId: number,
  path: string,
  data: Buffer
): Promise<FileInfo> {
  // ...
}

// ❌ anyの使用を避ける
function doSomething(data: any): any {
  // ...
}
```

### エラー処理

```typescript
// ✅ 具体的なエラー型
class StorageError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

try {
  // ...
} catch (error) {
  if (error instanceof StorageError) {
    res.status(400).json({ error: error.message });
  } else {
    res.status(500).json({ error: 'Internal error' });
  }
}
```

### 非同期処理

```typescript
// ✅ async/awaitを使用
async function processBackupJob(job: BackupQueueItem) {
  try {
    const file = await db.select().from(files).where(...);
    await storage.backup(file);
  } catch (error) {
    console.error('Backup failed:', error);
  }
}

// ❌ コールバック地獄を避ける
function processJob(job, callback) {
  db.select(..., (err, file) => {
    storage.backup(file, (err) => {
      callback(err);
    });
  });
}
```

---

## テスト戦略

### ユニットテスト

```typescript
// tests/oauth.test.ts
import { generatePKCEChallenge, verifyPKCEChallenge } from '../../server/oauth';

describe('OAuth PKCE', () => {
  it('should generate valid PKCE challenge', () => {
    const { codeVerifier, codeChallenge } = generatePKCEChallenge();
    expect(codeChallenge).toBeDefined();
    expect(verifyPKCEChallenge(codeVerifier, codeChallenge, 'S256')).toBe(true);
  });
});
```

### 統合テスト

```typescript
// tests/storage.integration.test.ts
import { storage } from '../../server/storage';

describe('Storage Integration', () => {
  it('should create and retrieve adapter', async () => {
    const adapter = await storage.createAdapter({
      name: 'Test',
      type: 'local',
      config: { path: '/tmp' }
    });
    
    const found = await storage.getAdapters();
    expect(found).toContainEqual(adapter);
  });
});
```

### 実装チェックリスト

機能実装時は以下を確認：

- [ ] TypeScriptコンパイルエラーなし
- [ ] 型定義完全
- [ ] エラーハンドリング実装
- [ ] ログ出力実装
- [ ] ドキュメント更新
- [ ] ユニットテスト作成
- [ ] 統合テスト実施

---

## デバッグ

### ローカル開発でのデバッグ

```bash
# ログレベル設定
LOG_LEVEL=debug npm run dev

# VSCode デバッガ設定 (.vscode/launch.json)
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch USSP",
      "program": "${workspaceFolder}/server/index.ts",
      "console": "integratedTerminal"
    }
  ]
}
```

### データベース確認

```bash
# SQLite (開発環境)
sqlite3 data/ussp.db
sqlite> SELECT * FROM users;

# PostgreSQL (本番環境)
psql -U user -d ussp
ussp=# SELECT * FROM users;
```

---

## 次のステップ

1. **S3 Adapterの実装**
   - AWS SDKのインストール
   - テスト環境のセットアップ
   - 統合テスト実施

2. **JavaScript SDKの公開**
   - npmレジストリへの登録
   - 型定義ファイル生成
   - ドキュメント

3. **Web UI完成**
   - Adapter設定画面
   - クライアント管理UI
   - バックアップ監視ダッシュボード

4. **本番デプロイメント**
   - Docker化
   - Kubernetes対応
   - 監視・ロギングシステム統合

---

## サポート

実装中に問題が発生した場合：

1. [SPECIFICATION.md](./SPECIFICATION.md) で仕様確認
2. 既存実装コードをリファレンスに
3. エラーメッセージとログを確認
4. GitHub Issues で報告
