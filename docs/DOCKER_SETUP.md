# Docker セットアップガイド

USSPをDocker Composeを使用してローカル開発環境で実行するガイドです。

## 前提条件

- Docker 20.10+
- Docker Compose 2.0+

## クイックスタート

### 1. 環境ファイルを作成

```bash
cp .env.example .env
```

基本設定は既に設定されています。必要に応じてカスタマイズしてください。

### 2. Docker Composeで起動

```bash
docker-compose up -d
```

初回起動時はイメージのビルドに数分かかります。

### 3. ログを確認

```bash
docker-compose logs -f ussp
```

`listening on port 5000` というメッセージが表示されたら準備完了です。

### 4. アプリケーションにアクセス

- **Web UI**: http://localhost:5000
- **API**: http://localhost:5000/api
- **MinIO Console**: http://localhost:9001 (Username: minioadmin, Password: minioadmin)
- **PostgreSQL**: localhost:5432 (Username: ussp, Password: ussp)

## 利用可能なサービス

### ussp (メインアプリケーション)
- ポート: 5000
- 開発モード: ホットリロード対応
- ボリューム: `./data` をマウント

### postgres (データベース)
- ポート: 5432
- ユーザー: ussp
- パスワード: ussp
- データベース: ussp
- ボリューム: `postgres_data` に永続化

### minio (S3互換ストレージ)
- S3 API ポート: 9000
- Console ポート: 9001
- デフォルト認証: minioadmin/minioadmin
- ボリューム: `minio_data` に永続化

### redis (キャッシング)
- ポート: 6379
- ボリューム: `redis_data` に永続化

## 環境変数

### 必須

```env
NODE_ENV=development
PORT=5000
```

### OAuth設定

```env
OAUTH_SECRET=dev-secret-key
JWT_SECRET=dev-jwt-secret
```

### ストレージ設定

#### ローカルストレージ（デフォルト）
```env
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=/app/data/storage
```

#### AWS S3
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
```

#### MinIO（ローカルS3互換）
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_BUCKET=ussp-bucket
AWS_ENDPOINT=http://minio:9000
```

#### Google Drive
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

### 管理者設定

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@ussp.local
```

## よく使うコマンド

### サービスを起動

```bash
docker-compose up -d
```

### サービスを停止

```bash
docker-compose down
```

### ボリュームも含めて削除（すべてのデータが削除されます）

```bash
docker-compose down -v
```

### ログを表示

```bash
# すべてのサービス
docker-compose logs -f

# 特定のサービス
docker-compose logs -f ussp
docker-compose logs -f postgres
```

### サービスを再起動

```bash
docker-compose restart ussp
```

### シェルを実行

```bash
docker-compose exec ussp sh
```

### データベースに接続

```bash
docker-compose exec postgres psql -U ussp -d ussp
```

## トラブルシューティング

### ポートが既に使われている

別のポートを使用するには `.env` または `docker-compose.yml` を編集してください。

```yaml
ports:
  - "8000:5000"  # ホスト:コンテナ
```

### データベース接続エラー

PostgreSQLが起動するまで少し時間がかかります。ログで確認：

```bash
docker-compose logs postgres
```

`database system is ready to accept connections` が表示されるまで待ってください。

### メモリ不足

Dockerのメモリを増やしてください。Docker Desktopの場合は設定 → Resources から変更できます。

### MinIOにバケットを作成

```bash
docker-compose exec minio mc mb minio/ussp-bucket
```

## 本番環境での使用

本番環境ではセキュリティを強化してください：

1. **環境変数を変更**
   - `OAUTH_SECRET` と `JWT_SECRET` を強力なランダム値に変更
   - `ADMIN_PASSWORD` を複雑なパスワードに変更

2. **HTTPS を有効化**
   - リバースプロキシ（nginx）を使用してHTTPS終端

3. **データの永続化**
   - ボリュームをネットワークストレージにマウント
   - 定期バックアップを設定

4. **リソース制限**
   - `docker-compose.yml` に `resources` セクションを追加

```yaml
services:
  ussp:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

5. **ログ管理**
   - Fluentd、ELKなどでログを集約

## Docker Hub へのデプロイ

```bash
# イメージをビルド
docker build -t yourname/ussp:latest .

# レジストリにログイン
docker login

# イメージをプッシュ
docker push yourname/ussp:latest
```

## Kubernetes デプロイメント

Kubernetesでのデプロイメント例は `k8s/` ディレクトリを参照してください。

## サポート

問題が発生した場合は、GitHub Issues またはドキュメントを確認してください。
