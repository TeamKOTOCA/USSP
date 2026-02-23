# USSP SDK Node.js/ブラウザ互換性ガイド

## 概要

USSP SDKはNode.js環境とブラウザ環境の両方で完全に動作するように設計されています。

## 環境別対応状況

### Node.js環境

#### サポート機能
- ✅ OAuth認証フロー（`generateAuthorizeUrl()` + `exchangeCode()`）
- ✅ ファイルアップロード（multipart/form-data）
- ✅ ファイルダウンロード（Buffer返却）
- ✅ バックアップ管理
- ✅ 管理API（ユーザー、アダプター、クライアント管理）

#### 使用例

```typescript
import USSP from "@ussp/sdk";

// SDK初期化
const ussp = new USSP({
  serverUrl: "https://api.ussp.example.com",
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
});

// OAuth フロー（サーバー側）
const authorizeUrl = await ussp.oauth.generateAuthorizeUrl({
  redirectUri: "http://localhost:3000/callback",
});
console.log("Redirect user to:", authorizeUrl);

// コールバックハンドラーで
const token = await ussp.oauth.exchangeCode("auth-code");
ussp.setAccessToken(token.accessToken);

// ファイルアップロード
const file = require("fs").readFileSync("path/to/file.txt");
const result = await ussp.files.upload({
  namespaceId: 1,
  path: "documents/file.txt",
  data: file,
  mimeType: "text/plain",
});

// ファイルダウンロード
const data = await ussp.files.download(1, "documents/file.txt");
// data: Buffer
```

### ブラウザ環境

#### サポート機能
- ✅ OAuth認証フロー（ポップアップウィンドウ）
- ✅ ファイルアップロード（FormData）
- ✅ ファイルダウンロード（Blob返却）
- ✅ バックアップ管理
- ✅ 管理API（ユーザー、アダプター、クライアント管理）

#### 使用例

```typescript
import USSP from "@ussp/sdk";

// SDK初期化
const ussp = new USSP({
  serverUrl: "https://api.ussp.example.com",
  clientId: "your-client-id",
});

// OAuth フロー（ワンステップ）
const token = await ussp.oauth.authorize({
  redirectUri: "https://yourapp.example.com/callback",
});
ussp.setAccessToken(token.accessToken);

// ファイルアップロード
const fileInput = document.getElementById("file") as HTMLInputElement;
const file = fileInput.files[0];
const result = await ussp.files.upload({
  namespaceId: 1,
  path: `uploads/${file.name}`,
  data: file,
  mimeType: file.type,
});

// ファイルダウンロード
const blob = await ussp.files.download(1, "documents/file.txt");
// blobをダウンロードさせる
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "file.txt";
a.click();
```

## 環境別の違い

### HTTP通信

| 機能 | Node.js | ブラウザ |
|------|---------|---------|
| HTTPクライアント | `http`/`https`モジュール | `fetch` API |
| リクエスト方式 | ネイティブNode.jsモジュール | Fetch API |
| Multipart処理 | 手動構築 | FormData |

### Crypto処理

| 機能 | Node.js | ブラウザ |
|------|---------|---------|
| ランダム生成 | `crypto.randomBytes()` | `crypto.getRandomValues()` |
| SHA256ハッシュ | `crypto.createHash()` | `crypto.subtle.digest()` |
| Base64URLエンコード | Buffer操作 | btoa() |

### ストレージ処理

| 機能 | Node.js | ブラウザ |
|------|---------|---------|
| ファイルダウンロード返却 | Buffer | Blob |
| Multipart送信 | 手動バイナリ構築 | FormData |
| ローカルストレージ | なし | sessionStorage（OAuth用） |

## ユーティリティ関数

### Cryptoユーティリティ（sdk/src/crypto-utils.ts）

```typescript
// ランダムバイト生成（Node.js/ブラウザ両対応）
const bytes = await generateRandomBytes(32);

// SHA256ハッシュ計算
const hash = await sha256("input");

// Base64URLエンコード
const encoded = base64UrlEncode(bytes);

// PKCE Code Verifier生成
const verifier = await generateCodeVerifier();

// PKCE Code Challenge生成
const challenge = await generateCodeChallenge(verifier);
```

### HTTPクライアント（sdk/src/http-client.ts）

```typescript
import { httpRequest } from "@ussp/sdk";

const response = await httpRequest("https://api.example.com/endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  data: { key: "value" },
  params: { query: "param" },
});

if (response.ok) {
  console.log(response.data);
} else {
  console.error(response.error);
}
```

## テスト

互換性テストを実行：

```bash
cd sdk
npm run test
```

## トラブルシューティング

### Node.js環境でFormDataエラー

**問題**: FormDataが見つからないエラー  
**解決**: Node.js 18.x以上を使用するか、フォールバック処理を確認

```typescript
// 古いNode.jsバージョン対応
if (typeof FormData === "undefined") {
  global.FormData = require("form-data");
}
```

### ブラウザでのOAuth timeout

**問題**: ポップアップがブロックされる  
**解決**: ユーザージェスチャー（クリック）内でauthorize()を呼び出し

```typescript
button.addEventListener("click", () => {
  // ユーザージェスチャー内で呼び出し
  await ussp.oauth.authorize({ redirectUri: "..." });
});
```

### CORS エラー

**問題**: ブラウザからのリクエストが失敗  
**解決**: サーバー側でCORSを適切に設定

```typescript
// server/index.tsの例
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
  credentials: true,
}));
```

## 推奨事項

- **認証フロー**: Node.js では手動フロー、ブラウザではワンステップフロー を使用
- **ファイル処理**: 型安全性のため、`File | Blob | Buffer | string` を正確に指定
- **エラーハンドリング**: 環境別のエラーに対応したtry-catchを実装
- **テスト**: e2eテストで両環境をテストすることを推奨

## API リファレンス

詳細なAPI仕様は `docs/SDK_GUIDE.md` を参照してください。
