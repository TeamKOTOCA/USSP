# USSP (Universal Secure Storage Platform) - ユーザーガイド

## 概要

USSPは、誰でも簡単にセットアップできる汎用ストレージサーバーです。ローカルディスク、AWS S3、Google Driveなど、複数のバックエンドに対応しており、自分のニーズに合わせてストレージを選択できます。

## 初期セットアップ

### 1. サーバーのインストール

```bash
# リポジトリをクローン
git clone https://github.com/TeamKOTOCA/USSP.git
cd USSP

# 依存関係をインストール
npm install

# ローカル開発環境で起動
npm run dev
```

サーバーは `http://localhost:5000` で起動します。

### 2. 管理パネルへアクセス

ブラウザで以下のURLにアクセス：

```
http://localhost:5000
```

### 3. 管理者アカウントの作成

初回起動時、管理者アカウントを作成するよう求められます：

```bash
# 管理者アカウントを作成（cURL例）
curl -X POST http://localhost:5000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "securepassword",
    "role": "admin"
  }'
```

## 管理パネルの使用方法

### ストレージアダプター設定

#### ローカルストレージ（推奨：開発環境）

1. **管理パネル** → **ストレージ設定** → **新規作成**
2. **タイプ** を「Local」に選択
3. **パス** に保存先ディレクトリを指定（例：`/data/ussp`）
4. **保存**

```json
{
  "path": "/var/data/ussp"
}
```

#### AWS S3（本番環境推奨）

1. **管理パネル** → **ストレージ設定** → **新規作成**
2. **タイプ** を「S3」に選択
3. 以下の情報を入力：

```json
{
  "bucket": "my-ussp-bucket",
  "region": "ap-northeast-1",
  "accessKeyId": "YOUR_ACCESS_KEY",
  "secretAccessKey": "YOUR_SECRET_KEY"
}
```

#### Cloudflare R2

```json
{
  "bucket": "my-r2-bucket",
  "accountId": "YOUR_ACCOUNT_ID",
  "accessKeyId": "YOUR_ACCESS_KEY",
  "secretAccessKey": "YOUR_SECRET_KEY",
  "endpoint": "https://{accountId}.r2.cloudflarestorage.com"
}
```

#### Google Drive

1. Google Cloud Consoleで認証キーを作成
2. 以下の情報を入力：

```json
{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

### ネームスペース（Namespace）管理

ネームスペースはストレージの論理的な分割です。例：公開アセット、プライベートファイル、バックアップなど。

#### 新規ネームスペース作成

1. **管理パネル** → **ネームスペース** → **作成**
2. **名前** を入力（例：`public-assets`）
3. **ストレージアダプター** を選択
4. **クォータ** を設定（例：1GB = 1073741824バイト）
5. **作成**

```
Name: public-assets
Storage Adapter: Default Local Storage
Quota: 1073741824 (1GB)
```

### OAuth クライアント登録

アプリケーションがストレージにアクセスするには、OAuthクライアントとして登録する必要があります。

#### 手順

1. **管理パネル** → **クライアント管理** → **新規登録**
2. **アプリケーション名** を入力（例：`My Web App`）
3. **リダイレクトURI** を入力

```
https://myapp.example.com/callback
http://localhost:3000/callback  (開発環境)
```

4. **登録**すると、以下が発行されます：
   - **Client ID**: アプリ識別用
   - **Client Secret**: 認証時に使用（厳秘）
   - **Redirect URIs**: 許可されたコールバックURL

アプリケーション開発者にこの情報を共有します。

## ファイル操作

### Web UIからのアップロード

1. **管理パネル** → **ファイル** → **アップロード**
2. ネームスペースを選択
3. ファイルをドラッグ&ドロップまたは選択
4. **アップロード**

### Web UIからのダウンロード

1. **管理パネル** → **ファイル一覧**
2. ダウンロード対象ファイルを検索
3. **ダウンロード** ボタンをクリック

## バックアップ機能

複数のストレージ間でファイルを自動バックアップできます。

### バックアップ設定

1. **管理パネル** → **バックアップ設定** → **新規作成**
2. **ソースアダプター** を選択（元のストレージ）
3. **ターゲットアダプター** を選択（バックアップ先）
4. **スケジュール** を設定
5. **有効化**

```
Source: Default Local Storage
Target: AWS S3 Backup
Schedule: Daily at 2:00 AM
```

### バックアップ進捗確認

1. **管理パネル** → **バックアップジョブ**
2. ジョブのステータスを確認

```
Job #1: primary → s3        [✓ 完了]   2024-02-23 02:15
Job #2: primary → gdrive    [⚙ 処理中] 2024-02-23 02:20
Job #3: primary → s3        [⏳ 待機中] 2024-02-23 09:00
```

## ユーザー管理

### 新規ユーザー追加

1. **管理パネル** → **ユーザー管理** → **新規追加**
2. **ユーザー名** を入力
3. **メールアドレス** を入力
4. **ロール** を選択：
   - **Admin**: 全機能へのアクセス
   - **User**: 基本的なファイル操作のみ
5. **パスワード** を設定
6. **作成**

### ユーザー権限変更

1. **管理パネル** → **ユーザー管理**
2. 対象ユーザーをクリック
3. **ロール** を変更
4. **保存**

### ユーザー無効化

1. **管理パネル** → **ユーザー管理**
2. 対象ユーザーをクリック
3. **無効化** チェックボックスを選択
4. **保存**

## セキュリティベストプラクティス

### 1. 定期的なバックアップ

- 複数のストレージにバックアップを作成
- 定期的にバックアップ検証を実行
- オフサイトバックアップを保持

### 2. 強力なパスワード設定

```
✅ 良い例:
- 最小12文字以上
- 大文字、小文字、数字、記号を混在
- 例: "MyS3cur3P@ssw0rd!"

❌ 悪い例:
- password123
- admin
- 12345678
```

### 3. CORS設定

信頼できるオリジンのみを許可：

```
環境変数: ALLOWED_ORIGINS
値: https://app.example.com,https://api.example.com
```

### 4. TLS/SSL設定

本番環境では必ずHTTPSを使用：

```
環境変数設定:
NODE_ENV=production
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem
```

### 5. クライアントシークレット管理

- クライアントシークレットは絶対に公開しない
- 定期的にシークレットをローテーション
- 環境変数で管理

## トラブルシューティング

### ストレージ接続エラー

**症状**: S3接続失敗

**対策**:
1. AWS認証情報を確認
2. IAMポリシーで必要な権限を確認
3. バケット名と地域を確認

```bash
# AWS CLIで接続テスト
aws s3 ls --profile ussp
```

### ファイルアップロード失敗

**症状**: アップロード時にタイムアウト

**対策**:
1. ファイルサイズを確認
2. ネットワーク接続を確認
3. ストレージクォータを確認

```bash
# ディスク使用量確認
df -h /var/data/ussp
```

### バックアップ失敗

**症状**: バックアップジョブが失敗

**対策**:
1. エラーメッセージを確認
2. 両ストレージの接続確認
3. ディスク容量確認

```bash
# ログを確認
tail -f /var/log/ussp/backup.log
```

## API例

### ファイルリストの取得

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:5000/api/files/list
```

### バックアップジョブ作成

```bash
curl -X POST http://localhost:5000/api/backup/create \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": 1,
    "sourceAdapterId": 1,
    "targetAdapterId": 2
  }'
```

## FAQ

### Q: ローカルディスクストレージの推奨容量は？

A: 運用環境により異なりますが、以下を目安にしてください：
- 開発環境: 1GB～5GB
- 小規模本番: 50GB～100GB
- 大規模本番: 1TB以上

### Q: バックアップはどの程度の頻度が必要？

A: 以下を目安にしてください：
- 開発環境: 毎日
- 本番環境: 最大6時間ごと（重要度により）

### Q: OAuth認証なしでファイルをアップロードできる？

A: できません。セキュリティ上の理由から、全てのアクセスはOAuthで認証されます。

### Q: クライアントシークレットが漏洩した場合は？

A: 管理パネルから該当クライアントを削除し、新規クライアントを作成してください。

## さらに詳しく

- [SDK統合ドキュメント](./SDK_DOCUMENTATION.md) - アプリケーション開発者向け
- [API リファレンス](./API_REFERENCE.md)
- [トラブルシューティングガイド](./TROUBLESHOOTING.md)

## サポート

問題が発生した場合は、以下にお問い合わせください：

- GitHubのIssue: https://github.com/TeamKOTOCA/USSP/issues
- メール: support@ussp.example.com
- ドキュメント: https://docs.ussp.example.com
