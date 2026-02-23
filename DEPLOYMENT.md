# USSP デプロイメント & 運用ガイド

## 環境要件

### 最小要件
- Node.js 18.0 以上
- npm 9.0 以上
- 1GB RAM
- 10GB ディスク容量

### 推奨（本番環境）
- Node.js 20 LTS
- 4GB RAM
- 100GB 以上のディスク容量
- PostgreSQL 13 以上（ローカルストレージ使用時は不要）
- Redis 6.0 以上（オプション：セッション管理用）

## ローカル開発環境セットアップ

### 1. リポジトリクローン

```bash
git clone https://github.com/TeamKOTOCA/USSP.git
cd USSP
```

### 2. 依存関係インストール

```bash
npm install
```

### 3. 環境変数設定（.env.local）

```bash
# 開発環境
NODE_ENV=development

# ローカル開発ではDATABASE_URLは不要（SQLiteを使用）
# DATABASE_URL は本番環境のみ設定

# OAuth
JWT_SECRET=dev-secret-key-change-in-production

# ポート
PORT=5000

# ローカルストレージパス
LOCAL_STORAGE_PATH=/var/data/ussp
```

### 4. 開発サーバー起動

```bash
npm run dev
```

サーバーが `http://localhost:5000` で起動します。

## 本番環境デプロイメント

### 1. 環境変数設定

```.env
# 本番環境
NODE_ENV=production

# PostgreSQL接続
DATABASE_URL=postgresql://user:password@hostname:5432/ussp_db

# JWT シークレット（強力なランダム文字列）
JWT_SECRET=your-very-secure-secret-key-minimum-32-characters

# CORS設定
ALLOWED_ORIGINS=https://app.example.com,https://api.example.com

# ポート
PORT=5000

# ログレベル
LOG_LEVEL=info

# TLS/SSL
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem
```

### 2. ビルド

```bash
npm run build
```

### 3. データベースマイグレーション

```bash
# Drizzle ORM マイグレーション
npm run db:push
```

### 4. サービス起動

```bash
npm start
```

## Docker デプロイメント

### Dockerfile例

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 依存関係インストール
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションコピー
COPY . .

# ビルド
RUN npm run build

# ポート公開
EXPOSE 5000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# アプリケーション起動
CMD ["npm", "start"]
```

### Docker Composeで本番環境構築

```yaml
version: '3.8'

services:
  ussp:
    build: .
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://ussp:password@db:5432/ussp_db
      JWT_SECRET: ${JWT_SECRET}
      ALLOWED_ORIGINS: https://app.example.com
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./data/storage:/var/data/ussp
      - ./certs:/etc/ssl/certs:ro
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ussp
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ussp_db
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ussp"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  db-data:
  redis-data:
```

起動：
```bash
docker-compose up -d
```

## Kubernetes デプロイメント

### Deployment例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ussp
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ussp
  template:
    metadata:
      labels:
        app: ussp
    spec:
      containers:
      - name: ussp
        image: your-registry/ussp:v1.0.0
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ussp-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: ussp-secrets
              key: jwt-secret
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: storage
          mountPath: /var/data/ussp
      volumes:
      - name: storage
        persistentVolumeClaim:
          claimName: ussp-storage
---
apiVersion: v1
kind: Service
metadata:
  name: ussp-service
spec:
  selector:
    app: ussp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5000
  type: LoadBalancer
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ussp-storage
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
```

## Vercel へのデプロイメント

### 1. Vercel CLIインストール

```bash
npm install -g vercel
```

### 2. デプロイ

```bash
vercel deploy
```

### 3. 環境変数設定

Vercelプロジェクトダッシュボード:
- Settings → Environment Variables
- 上記の環境変数を設定

## AWS デプロイメント（EC2 + RDS）

### 1. EC2インスタンス作成

```bash
# Ubuntu 22.04 LTS
# インスタンスタイプ: t3.medium 以上
# ストレージ: 100GB 以上（gp3推奨）
```

### 2. セットアップスクリプト

```bash
#!/bin/bash
set -e

# システムアップデート
sudo apt update
sudo apt upgrade -y

# Node.js インストール
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 必要なツールをインストール
sudo apt install -y git nginx certbot python3-certbot-nginx

# アプリケーションクローン
git clone https://github.com/TeamKOTOCA/USSP.git /opt/ussp
cd /opt/ussp

# 依存関係インストール
npm install
npm run build

# systemd サービス作成
sudo tee /etc/systemd/system/ussp.service > /dev/null <<EOF
[Unit]
Description=USSP Storage Server
After=network.target

[Service]
Type=simple
User=ussp
WorkingDirectory=/opt/ussp
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# サービス有効化
sudo systemctl daemon-reload
sudo systemctl enable ussp
sudo systemctl start ussp
```

### 3. Nginx リバースプロキシ設定

```nginx
server {
    server_name storage.example.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/storage.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/storage.example.com/privkey.pem;
}

server {
    server_name storage.example.com;
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

## モニタリング & ログ

### ヘルスチェック

```bash
curl http://localhost:5000/health
```

### ログ出力

開発環境：
```bash
npm run dev 2>&1 | tee ussp.log
```

本番環境（systemd）：
```bash
sudo journalctl -u ussp -f
```

### ログローテーション

```bash
# /etc/logrotate.d/ussp
/var/log/ussp/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 ussp ussp
    sharedscripts
    postrotate
        systemctl reload ussp > /dev/null 2>&1 || true
    endscript
}
```

## パフォーマンス最適化

### 1. キャッシング

RedisをセッションとOAuthトークンキャッシュに使用：

```bash
# .env
REDIS_URL=redis://localhost:6379
```

### 2. CDN統合

静的ファイルをCDNで配信：

```
CloudflareまたはCloudFront設定
キャッシュルール: /static/* → 86400秒
```

### 3. データベース最適化

```sql
-- インデックス作成
CREATE INDEX idx_files_namespace ON files(namespace_id);
CREATE INDEX idx_oauth_tokens_client ON oauth_tokens(client_id);
CREATE INDEX idx_backup_queue_status ON backup_queue(status);

-- 定期メンテナンス
VACUUM ANALYZE;
```

## バックアップ & ディザスタリカバリ

### 自動バックアップスクリプト

```bash
#!/bin/bash
# /opt/ussp/backup.sh

BACKUP_DIR="/backups/ussp"
DATE=$(date +%Y%m%d_%H%M%S)

# データベースバックアップ
pg_dump $DATABASE_URL > $BACKUP_DIR/db_$DATE.sql

# ストレージバックアップ
tar -czf $BACKUP_DIR/storage_$DATE.tar.gz /var/data/ussp

# 古いバックアップ削除（30日以上）
find $BACKUP_DIR -name "*.sql" -o -name "*.tar.gz" | xargs -I {} find {} -mtime +30 -delete

echo "Backup completed at $DATE"
```

### Cron設定

```bash
# 毎日AM 2:00 にバックアップ
0 2 * * * /opt/ussp/backup.sh >> /var/log/ussp/backup.log 2>&1
```

## セキュリティチェックリスト

- [ ] NODE_ENV=production に設定
- [ ] JWT_SECRET を強力なランダム文字列に設定
- [ ] SSL/TLS証明書を設定（Let's Encrypt推奨）
- [ ] ファイアウォールで必要なポートのみを公開
- [ ] CORS設定で許可するOriginを制限
- [ ] 定期的にセキュリティアップデートを適用
- [ ] データベースバックアップを別拠点に保存
- [ ] ログを集約・監視
- [ ] アクセスログを記録・分析

## トラブルシューティング

### ポート5000が既に使用されている

```bash
# ポート確認
lsof -i :5000

# 別のポートで起動
PORT=8000 npm start
```

### データベース接続エラー

```bash
# PostgreSQL接続テスト
psql $DATABASE_URL -c "SELECT 1"
```

### メモリ不足エラー

```bash
# Node.jsのヒープサイズを増加
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

## サポート

問題が発生した場合は、GitHubのIssueまたはドキュメントを参照してください。
