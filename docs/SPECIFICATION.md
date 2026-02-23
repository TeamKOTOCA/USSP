# USSP - Universal Structured Storage Protocol 仕様書

## 目次
1. [概要](#概要)
2. [基本機能一覧](#基本機能一覧)
3. [技術アーキテクチャ](#技術アーキテクチャ)
4. [API仕様](#api仕様)
5. [認証・認可フロー](#認証認可フロー)
6. [実装状況](#実装状況)

---

## 概要

USSP（Universal Structured Storage Protocol）は、バックエンドを必要とせずセキュアなストレージを提供する、OSS化されたストレージ基盤です。

### 目的
- OSS化されたストレージサーバーの提供
- マルチバックエンド対応（Local/S3/MinIO/R2/Google Drive等）による柔軟なストレージ選択
- OAuth2.0認証基盤の内包
- SDK提供による簡易な統合

---

## 基本機能一覧

| 機能 | 内容 | 実装状況 |
|------|------|---------|
| **マルチバックエンド対応** | Local / S3 / MinIO / Cloudflare R2 / Google Drive | ✅ Local実装済、S3/R2/GDrive設計済 |
| **OAuth2.0認証基盤** | Authorization Code + PKCE対応 | ✅ 実装済 |
| **API認可管理** | namespace × client スコープベース | ✅ 実装済 |
| **バックアップ機能** | 非同期バックアップキュー | ✅ 実装済 |
| **Web管理UI** | ストレージ選択・クライアント管理 | ⚠️ 部分実装（フロントエンド構築中） |
| **JavaScript SDK** | USSP.config.url() での接続先設定 | ⚠️ 計画中 |
| **並列変更耐性** | ETag / Optimistic Lock | ✅ ETag実装済 |
| **ユーザー管理** | 管理者・ユーザーロール管理 | ✅ 実装済 |

---

## 技術アーキテクチャ

```
┌─────────────────────┐
│   Web Client        │  <- SPA/Third-party
│ (USSP SDK: JS)      │
└──────────┬──────────┘
           │
       OAuth + API calls
           │
┌──────────v──────────┐
│   USSP Server       │  <- Node.js (Express)
│ Authn/Z + Logic     │
│ Storage Adapter     │
└─┬───┬───┬───┬──────┘
  │   │   │   │
  │   │   │   └── Google Drive Adapter
  │   │   └────── Cloudflare R2 Adapter
  │   └────────── S3 Compatible Adapter
  └────────────── Local Filesystem Adapter
```

### コンポーネント概要

#### 1. コア（サーバー）
- **db.ts**: Drizzle ORM統合、SQLite/PostgreSQL対応
- **storage.ts**: ストレージ抽象化レイヤー、アダプター管理
- **oauth.ts**: OAuth2.0実装（PKCE対応）
- **file-handler.ts**: ファイルアップロード・ダウンロード
- **backup-queue.ts**: 非同期バックアップ処理

#### 2. スキーマ
- **users**: 管理者・ユーザー情報
- **storageAdapters**: ストレージ設定
- **namespaces**: ファイル名前空間
- **oauthClients**: OAuth クライアント登録
- **oauthTokens**: 認可コード・トークン管理
- **files**: ファイルメタデータ
- **backupQueue**: バックアップジョブ管理

---

## API仕様

### 認証関連

#### 1. 認可エンドポイント
```http
GET /oauth/authorize?client_id=...&redirect_uri=...&code_challenge=...&state=...
```

**レスポンス**: ユーザーをリダイレクト

---

#### 2. トークンエンドポイント
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

code=...&client_id=...&code_verifier=...
```

**レスポンス**:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

### ファイル操作

#### 3. ファイルアップロード
```http
POST /api/files/upload
Authorization: Bearer {access_token}
Content-Type: application/octet-stream

{body: binary}
```

**リクエストボディ**:
```json
{
  "namespaceId": 1,
  "path": "documents/report.pdf"
}
```

**レスポンス**:
```json
{
  "path": "documents/report.pdf",
  "size": 1024000,
  "mimeType": "application/pdf",
  "etag": "abc123def456"
}
```

---

#### 4. ファイルダウンロード
```http
GET /api/files/download?namespaceId=1&path=documents/report.pdf
Authorization: Bearer {access_token}
```

**レスポンス**: ファイルバイナリ

---

### ストレージアダプター管理

#### 5. アダプター一覧
```http
GET /api/adapters
```

**レスポンス**:
```json
[
  {
    "id": 1,
    "name": "Local Storage",
    "type": "local",
    "isDefault": true,
    "config": { "path": "/data/storage" }
  },
  {
    "id": 2,
    "name": "AWS S3",
    "type": "s3",
    "config": {
      "bucket": "my-bucket",
      "region": "us-east-1",
      "accessKeyId": "...",
      "secretAccessKey": "..."
    }
  }
]
```

---

#### 6. アダプター作成
```http
POST /api/adapters
Content-Type: application/json

{
  "name": "My S3 Bucket",
  "type": "s3",
  "config": {
    "bucket": "my-bucket",
    "region": "us-east-1",
    "accessKeyId": "...",
    "secretAccessKey": "..."
  }
}
```

---

### Namespace管理

#### 7. Namespace一覧
```http
GET /api/namespaces
```

---

#### 8. Namespace作成
```http
POST /api/namespaces

{
  "name": "my-app-files",
  "storageAdapterId": 1,
  "quotaBytes": 1073741824
}
```

---

### OAuth クライアント管理

#### 9. クライアント登録
```http
POST /api/oauth-clients

{
  "name": "My SPA App",
  "redirectUris": ["https://myapp.com/callback", "http://localhost:3000/callback"]
}
```

**レスポンス**:
```json
{
  "id": 1,
  "clientId": "abc123...",
  "clientSecret": "secret123...",
  "name": "My SPA App",
  "redirectUris": ["https://myapp.com/callback"]
}
```

---

### バックアップ

#### 10. バックアップジョブ作成
```http
POST /api/backup/create
Authorization: Bearer {access_token}

{
  "fileId": 1,
  "sourceAdapterId": 1,
  "targetAdapterId": 2
}
```

---

#### 11. バックアップ状態確認
```http
GET /api/backup/status?status=pending
Authorization: Bearer {access_token}
```

---

### 管理者機能

#### 12. ユーザー作成
```http
POST /api/admin/users

{
  "username": "admin",
  "email": "admin@example.com",
  "password": "secure_password",
  "role": "admin"
}
```

---

#### 13. ユーザー一覧
```http
GET /api/admin/users
```

---

#### 14. 管理者ログイン
```http
POST /api/admin/login

{
  "username": "admin",
  "password": "password"
}
```

**レスポンス**:
```json
{
  "adminToken": "...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

---

## 認証・認可フロー

### OAuth2.0 Authorization Code Flow + PKCE

```
1. Client生成 PKCE Challenge
   ├─ code_verifier: ランダム64文字
   └─ code_challenge: SHA256(code_verifier)

2. ブラウザリダイレクト
   GET /oauth/authorize?
     client_id=...
     &redirect_uri=https://client.com/callback
     &code_challenge=...
     &code_challenge_method=S256

3. ユーザー認可（UI画面）
   └─ 同意後、認可コード発行

4. トークン交換
   POST /oauth/token
   code=...
   &client_id=...
   &code_verifier=...

5. レスポンス
   {
     "access_token": "JWT...",
     "token_type": "Bearer",
     "expires_in": 3600
   }

6. API呼び出し
   GET /api/files/download
   Authorization: Bearer {access_token}
```

### JWT フォーマット

```
Header: { "alg": "HS256", "typ": "JWT" }
Payload: {
  "clientId": "abc123...",
  "iat": 1234567890,
  "exp": 1234571490
}
Signature: HMAC-SHA256(key, header.payload)
```

---

## 実装状況

### ✅ 実装済

- [x] SQLite/PostgreSQL データベース対応
- [x] Local ストレージアダプター
- [x] OAuth2.0 PKCE 認認
- [x] ファイルアップロード・ダウンロード（Local）
- [x] バックアップキュー（非同期処理）
- [x] ユーザー管理（CRUD）
- [x] 管理者ロール・権限管理
- [x] ETag による並列変更耐性

### ⚠️ 部分実装・計画中

- [ ] S3/MinIO アダプター実装
- [ ] Cloudflare R2 アダプター実装
- [ ] Google Drive アダプター実装
- [ ] JavaScript SDK 実装
- [ ] Web管理UI（React フロントエンド）
- [ ] リフレッシュトークン機構
- [ ] Rate Limiting
- [ ] クォータ管理・チェック
- [ ] ファイルメタデータ検索機能

### 📋 TODO

1. **S3アダプター** (`server/adapters/s3-adapter.ts`)
   - AWS SDK統合
   - MinIO互換性対応

2. **Google Drive アダプター** (`server/adapters/gdrive-adapter.ts`)
   - Google API 統合
   - 認証フロー実装

3. **JavaScript SDK** (`sdk/index.ts`)
   - PKCE自動実装
   - ファイルAPI ラッパー
   - ブラウザ互換性

4. **Web管理UI** (`client/src/pages/`)
   - Dashboard
   - Adapter設定画面
   - OAuth Client管理
   - ユーザー管理

---

## デプロイメント

### 開発環境
```bash
npm run setup
npm run dev
```

### 本番環境
```bash
export NODE_ENV=production
export DATABASE_URL=postgresql://...
export JWT_SECRET=your-secret-key
npm run build
npm run start
```

詳細は `DEPLOYMENT.md` を参照してください。
