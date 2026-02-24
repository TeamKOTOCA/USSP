# USSP サーバー管理者ガイド

## 目次

1. [セットアップ](#セットアップ)
2. [ストレージアダプター設定](#ストレージアダプター設定)
3. [OAuth クライアント管理](#oauth-クライアント管理)
4. [ユーザー・権限管理](#ユーザー権限管理)
5. [バックアップ管理](#バックアップ管理)
6. [運用・モニタリング](#運用モニタリング)
7. [セキュリティ](#セキュリティ)
8. [トラブルシューティング](#トラブルシューティング)

---

## セットアップ

### 前提条件

- Node.js 18+
- npm / yarn / pnpm
- PostgreSQL / MySQL / SQLite

### データベース選択（開発/本番共通）

USSP は **開発環境・本番環境どちらでも** PostgreSQL / MySQL / SQLite を利用できます。

- SQLite: アプリ内部で管理（`data/ussp.db`。`SQLITE_PATH` で変更可）
- PostgreSQL: 外部DBサーバーへ接続
- MySQL: 外部DBサーバーへ接続

```env
# sqlite | postgres | mysql
DB_CLIENT=sqlite

# postgres / mysql 利用時に必須
DATABASE_URL=postgresql://user:password@db-host:5432/ussp
# 例: mysql://user:password@db-host:3306/ussp

# sqlite 利用時（任意）
SQLITE_PATH=./data/ussp.db
```

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/ussp.git
cd ussp

# 依存関係をインストール
npm install

# ローカル開発用セットアップ
npm run setup
```

### 環境設定

`.env` ファイルを作成してください：

```env
# 環境
NODE_ENV=development

# ポート
PORT=5000

# データベース（本番環境）
DATABASE_URL=postgresql://user:password@localhost:5432/ussp

# JWT秘密鍵
JWT_SECRET=your-very-secret-key-min-32-chars

# OAuth設定
OAUTH_JWT_SECRET=your-oauth-jwt-secret-key

# ログレベル
LOG_LEVEL=info

# バックアップ処理
BACKUP_CHECK_INTERVAL=5000
```

#### 本番環境用 `.env.production`

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/ussp
JWT_SECRET=production-secret-key-very-long-and-secure
PORT=3000
BACKUP_CHECK_INTERVAL=30000
```

### 初期化スクリプト実行

```bash
# 自動セットアップ（ディレクトリ作成、DB初期化）
npm run setup
```

このスクリプトが実行する内容：
- `data/` ディレクトリ作成
- `data/storage/` ローカルストレージパス作成
- SQLite DB 初期化（開発環境）

### サーバー起動

```bash
# 開発環境
npm run dev

# 本番環境
npm run build
npm run start
```

---

## ストレージアダプター設定

### Local ストレージ

ローカルディスクにファイルを保存します。開発環境のデフォルト。

#### API で設定

```bash
curl -X POST http://localhost:5000/api/adapters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Local Storage",
    "type": "local",
    "config": {
      "path": "/data/storage"
    }
  }'
```

#### レスポンス

```json
{
  "id": 1,
  "name": "Local Storage",
  "type": "local",
  "config": { "path": "/data/storage" },
  "isDefault": true,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### AWS S3 ストレージ

**ステータス**: 実装予定

S3アダプターが実装されたら、以下のように設定できます：

```bash
curl -X POST http://localhost:5000/api/adapters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AWS S3",
    "type": "s3",
    "config": {
      "bucket": "my-ussp-bucket",
      "region": "us-east-1",
      "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
      "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    }
  }'
```

### Cloudflare R2 ストレージ

**ステータス**: 実装予定

R2アダプター実装後：

```bash
curl -X POST http://localhost:5000/api/adapters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cloudflare R2",
    "type": "r2",
    "config": {
      "bucket": "my-r2-bucket",
      "accountId": "your-account-id",
      "accessKeyId": "...",
      "secretAccessKey": "..."
    }
  }'
```

### Google Drive ストレージ

**ステータス**: 実装予定

Google Drive連携対応予定。

---

## OAuth クライアント管理

### OAuth クライアント運用方針（推奨）

- 開発者は任意の `client_id` をSDK設定に指定します。
- サーバー側で事前登録しなくても、初回OAuth時に `client_id` をキーとしてOAuthクライアントとnamespaceを自動作成します。
- `redirect_uri` はリクエスト時の値へそのままリダイレクトされます。

### クライアント登録

SPAやモバイルアプリからのアクセスを許可するには、OAuth クライアントを登録します。

```bash
curl -X POST http://localhost:5000/api/oauth-clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My SPA App",
    "redirectUris": [
      "https://myapp.com/callback",
      "http://localhost:3000/callback"
    ]
  }'
```

#### レスポンス

```json
{
  "id": 1,
  "name": "My SPA App",
  "clientId": "abc123def456...",
  "clientSecret": "secret789...",
  "redirectUris": [
    "https://myapp.com/callback",
    "http://localhost:3000/callback"
  ],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**重要**: `clientSecret` は安全に保管してください（サーバー側のみで使用）

### クライアント一覧

```bash
curl http://localhost:5000/api/oauth-clients
```

### クライアント削除

```bash
curl -X DELETE http://localhost:5000/api/oauth-clients/1
```

---

## ユーザー・権限管理

### 管理者アカウント作成

初期段階で管理者アカウントを作成します：

```bash
curl -X POST http://localhost:5000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "secure-password-here",
    "role": "admin"
  }'
```

### 管理者ログイン

```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "secure-password-here"
  }'
```

#### レスポンス

```json
{
  "adminToken": "token123...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "email": "admin@example.com",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### ユーザー一覧

```bash
curl http://localhost:5000/api/admin/users
```

### ユーザー作成

```bash
curl -X POST http://localhost:5000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "user-password",
    "role": "user"
  }'
```

### ユーザー更新

```bash
curl -X PATCH http://localhost:5000/api/admin/users/2 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "role": "admin",
    "isActive": true
  }'
```

### ユーザー削除

```bash
curl -X DELETE http://localhost:5000/api/admin/users/2
```

---

## Namespace 管理

### Namespace 作成

各アプリケーション用のNamespaceを作成します：

```bash
curl -X POST http://localhost:5000/api/namespaces \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app-files",
    "storageAdapterId": 1,
    "quotaBytes": 1073741824
  }'
```

**quotaBytes**: 1GB = 1073741824 bytes

### Namespace 一覧

```bash
curl http://localhost:5000/api/namespaces
```

### Namespace 削除

```bash
curl -X DELETE http://localhost:5000/api/namespaces/1
```

---

## バックアップ管理

### バックアップジョブ作成

ファイルを別のストレージアダプターにバックアップ：

```bash
curl -X POST http://localhost:5000/api/backup/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {access_token}" \
  -d '{
    "fileId": 1,
    "sourceAdapterId": 1,
    "targetAdapterId": 2
  }'
```

### バックアップ状況確認

```bash
curl http://localhost:5000/api/backup/status
```

**フィルタリング**:

```bash
# Pending ジョブのみ
curl http://localhost:5000/api/backup/status?status=pending

# 完了したジョブ
curl http://localhost:5000/api/backup/status?status=completed

# 失敗したジョブ
curl http://localhost:5000/api/backup/status?status=failed
```

#### レスポンス例

```json
[
  {
    "id": 1,
    "fileId": 5,
    "sourceAdapterId": 1,
    "targetAdapterId": 2,
    "status": "in_progress",
    "errorMessage": null,
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": null
  },
  {
    "id": 2,
    "fileId": 6,
    "sourceAdapterId": 1,
    "targetAdapterId": 2,
    "status": "completed",
    "errorMessage": null,
    "createdAt": "2024-01-15T10:25:00Z",
    "completedAt": "2024-01-15T10:27:15Z"
  }
]
```

---

## 運用・モニタリング

### ヘルスチェック

```bash
curl http://localhost:5000/health
```

### 統計情報

```bash
curl http://localhost:5000/api/stats
```

#### レスポンス例

```json
{
  "totalStorage": 5368709120,
  "totalFiles": 1245,
  "activeClients": 8,
  "activeAdapters": 3,
  "activeNamespaces": 12
}
```

### ログ確認

```bash
# 開発環境
tail -f data/logs/app.log

# Docker環境
docker logs ussp-server
```

### データベース バックアップ

```bash
# PostgreSQL のバックアップ
pg_dump -U user -h localhost ussp > backup_$(date +%Y%m%d_%H%M%S).sql

# SQLite のバックアップ
cp data/ussp.db data/ussp_$(date +%Y%m%d_%H%M%S).db
```

---

## セキュリティ

### ベストプラクティス

1. **JWT秘密鍵の管理**
   - 環境変数で管理（ハードコード禁止）
   - 定期的にローテーション
   - 本番と開発で別キーを使用

2. **パスワードポリシー**
   - 最小8文字
   - 大文字・小文字・数字・特殊文字を含む
   - 定期的な変更要求

3. **HTTPS の強制**
   - 本番環境では必須
   - SSL証明書の定期更新

4. **レート制限**
   - ログイン試行: 5回/分
   - API: 1000リクエスト/時間
   - ファイルアップロード: 100MB/リクエスト

5. **アクセス制御**
   - 管理者APIに認証要求
   - CORS 設定を厳格に
   - IP ホワイトリスト（オプション）

### セキュリティヘッダー設定

```javascript
// server/index.ts
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

---

## トラブルシューティング

### Q: "DATABASE_URL must be set" エラー

A: 以下を確認してください：

1. `.env` ファイルが存在するか
2. `DATABASE_URL` が設定されているか
3. 環境が `production` でないか（開発環境はSQLiteが自動使用）

```bash
# 確認
echo $DATABASE_URL

# 開発環境で強制的にSQLiteを使用
unset DATABASE_URL
npm run dev
```

### Q: ポートが既に使用されている

A: 別のプロセスが使用中です：

```bash
# ポート使用状況確認
lsof -i :5000

# 別ポートを使用
PORT=5001 npm run dev
```

### Q: ストレージが満杯

A: ディスク空き容量を確認し、クリーンアップ：

```bash
# ディスク使用状況
df -h

# 古いバックアップを削除
find data/ -name "*.bak" -mtime +30 -delete
```

### Q: バックアップが失敗する

A: 以下を確認：

1. ターゲットアダプター設定が正しいか
2. ディスク空き容量
3. ファイルパーミッション

```bash
# ログ確認
tail -f data/logs/app.log | grep -i backup
```

---

## デプロイメント

詳細は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。
