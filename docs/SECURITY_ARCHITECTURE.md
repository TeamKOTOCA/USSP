# USSP セキュリティアーキテクチャ

## 概要

USSP は3つの独立したセキュリティレイヤーで構成され、異なるアクセスパターンに対応しています：

1. **Web UI 管理セッション** - Cookie ベースのセッション管理
2. **OAuth2 トークン認証** - SDK/クライアント用の Bearer token
3. **公開アクセス制御** - バックエンドレスサービス向けの公開トークン

---

## セキュリティレイヤー

### 1. Web UI 管理セッション

**用途**: 管理者による設定管理（アダプター、ネームスペース、クライアント、ユーザー管理）

**認証方式**:
- HTTP-only Cookie に格納されたセッション ID
- セッションはサーバー側でメモリ管理（本番環境では Redis推奨）
- 24時間のセッション有効期限

**保護対象エンドポイント**:
```
GET    /api/adapters
POST   /api/adapters
DELETE /api/adapters/:id
GET    /api/namespaces
POST   /api/namespaces
DELETE /api/namespaces/:id
GET    /api/clients
POST   /api/clients
DELETE /api/clients/:id
GET    /api/admin/users
POST   /api/admin/users
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id
DELETE /api/admin/users/:id
```

**フロー**:
```typescript
// 1. ログイン
POST /api/admin/login
{
  username: "admin",
  password: "secure-password"
}
↓
// レスポンス: HTTP-only Cookie に admin_session が設定される

// 2. 管理操作
GET /api/adapters
// Cookie の admin_session が自動的に送信される

// 3. ミドルウェア処理
requireAdminSession → adminOnly → API ハンドラー
```

**セキュリティ機能**:
- `httpOnly: true` - JavaScript からのアクセス不可
- `secure: true` (本番環境) - HTTPS 通信のみ
- `sameSite: "strict"` - CSRF 攻撃防止
- セッション有効期限管理

---

### 2. OAuth2 トークン認証

**用途**: SDK/クライアントアプリケーション用のファイル操作・バックアップ

**認証方式**:
- PKCE（Proof Key for Code Exchange）による Authorization Code Flow
- JWT トークン（HS256署名）
- Bearer token で HTTP Authorization ヘッダーに送信

**保護対象エンドポイント**:
```
POST   /api/files/upload
GET    /api/files/download
POST   /api/backup/create
GET    /api/backup/status
```

**フロー**:
```typescript
// 1. 認可要求
GET /oauth/authorize
  ?client_id=my-app
  &redirect_uri=https://app.example.com/callback
  &code_challenge=E9Mrozoa0owWoUgT5K1BjieaASDFQEjR6dHbDMsqV1I
  &code_challenge_method=S256
↓
// ユーザーが認可 → Authorization Code がリダイレクト

// 2. トークン交換
POST /oauth/token
{
  code: "auth_code_from_redirect",
  client_id: "my-app",
  code_verifier: "abcdef123456..."
}
↓
// レスポンス:
{
  access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  refresh_token: "refresh_token_value",
  token_type: "Bearer",
  expires_in: 3600
}

// 3. API 呼び出し
GET /api/files/download?namespaceId=1&path=file.txt
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**トークン検証**:
```typescript
// server/middleware/security.ts
requireOAuthToken:
  1. Authorization ヘッダーから Bearer token を抽出
  2. JWT シグネチャを検証（JWT_SECRET 使用）
  3. トークン有効期限チェック
  4. clientId をリクエストに添付
```

**トークン形式**:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
.
{
  "clientId": "my-app",
  "iat": 1234567890,
  "exp": 1234571490
}
.
[signature]
```

---

### 3. 公開アクセス制御

**用途**: バックエンドレスサービス向けの公開ファイルアクセス

**実装予定**:
- 公開トークン（有効期限付き）をデータベースで管理
- 特定のネームスペース/ファイルへの読取アクセスのみ
- クエリパラメータで公開トークンを送信

```typescript
GET /api/files/download
  ?namespaceId=1
  &path=public-file.pdf
  &public_token=public_xyz123...
```

---

## SDK 側のセキュリティ実装

### JavaScript/Node.js SDK

```typescript
import { USSP } from '@ussp/sdk';

const ussp = new USSP({
  serverUrl: 'https://api.ussp.example.com',
  clientId: 'my-app-id'
});

// 1. OAuth フロー
const authorizeUrl = await ussp.oauth.generateAuthorizeUrl({
  redirectUri: 'https://myapp.example.com/callback'
});
// ユーザーをリダイレクト

// 2. コールバック処理
const token = await ussp.oauth.exchangeCode(authCode);
ussp.setAccessToken(token.access_token);

// 3. ファイル操作
await ussp.files.upload({
  namespaceId: 1,
  path: 'documents/file.pdf',
  data: fileBuffer
});
```

**トークン保存**:
- ブラウザ環境: `sessionStorage` または `Memory` に保存（localStorage は避ける）
- Node.js 環境: ファイルまたは環境変数に保存
- リフレッシュトークンはセキュアに保管

---

## 管理者 API アクセス制限

**ルール**: Web UI セッションを持つ管理者のみがアクセス可能

**実装**:
```typescript
// すべての /api/admin/* エンドポイント
app.post("/api/admin/users",
  requireAdminSession,  // ← セッション検証
  adminOnly,            // ← 管理権限検証
  handler
);
```

**SDK からのアクセス**:
- `/api/admin/*` への OAuth トークンでのアクセスは **拒否される**
- SDK ユーザーは管理権限を持たない設計

```typescript
// 拒否される例
const token = await ussp.oauth.exchangeCode(authCode);
ussp.setAccessToken(token.access_token);

// これは 403 Forbidden で拒否される
await fetch('https://api.ussp.example.com/api/admin/users', {
  headers: {
    Authorization: `Bearer ${token.access_token}`
  }
});
```

---

## 環境変数設定

```bash
# JWT 署名用秘密鍵（必須）
JWT_SECRET=your-super-secret-key-min-32-chars

# デバッグモード（開発環境のみ）
NODE_ENV=development

# データベース接続
DATABASE_URL=postgresql://user:password@localhost/ussp
```

---

## セキュリティベストプラクティス

### サーバー側

1. **本番環境での HTTPS 強制**
   ```typescript
   secure: process.env.NODE_ENV === "production"
   ```

2. **JWT_SECRET の安全な管理**
   - 環境変数で管理
   - 定期的なロテーション
   - 最小32文字以上

3. **セッション管理の改善**
   - ローカル実装 → Redis に移行
   - セッション暗号化
   - CSRF トークン実装

4. **レート制限**
   - ログイン試行回数制限
   - API 呼び出し制限
   - IP ホワイトリスト（オプション）

### SDK 側

1. **トークン保存**
   - localStorage は避ける（XSS 脆弱性）
   - sessionStorage または Memory に保存
   - HttpOnly Cookie は使用不可（OAuth フロー）

2. **リフレッシュトークン**
   - secure で保存
   - アクセストークン有効期限チェック後に自動更新

3. **HTTPS 通信**
   - 本番環境では常に HTTPS
   - 証明書ピニング（モバイルアプリ）

---

## トラブルシューティング

### 管理者ログイン失敗
- ユーザーが `/api/admin/users` で作成されているか確認
- パスワードが正確に入力されているか確認
- データベース接続が正常か確認

### OAuth フロー失敗
- `client_id` が正確か確認
- `redirect_uri` がクライアント登録時の値と一致するか確認
- PKCE チャレンジが正確に生成されているか確認

### トークン有効期限エラー
- トークン有効期限（3600秒）を超えていないか確認
- リフレッシュトークンで新規トークンを取得

---

## まとめ

| アクセスタイプ | 認証方式 | エンドポイント | トークンタイプ |
|---|---|---|---|
| 管理者（Web UI） | Cookie Session | /api/adapters, /api/admin/* | Session ID |
| SDK/クライアント | OAuth2 | /api/files/*, /api/backup/* | JWT Bearer |
| 公開アクセス | 公開トークン | /api/files/download (読取のみ) | 公開トークン |
