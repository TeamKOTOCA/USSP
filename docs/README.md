# USSP ドキュメント

USSSPプロジェクトの完全ドキュメントセットです。用途に応じて参照してください。

---

## 📚 ドキュメント一覧

### 🎯 ユーザー・開発者向け

#### [SDK_GUIDE.md](./SDK_GUIDE.md) - **SDKの統合ガイド**
Web アプリケーションから USSP を利用したい開発者向け。

**内容**:
- クイックスタート
- 認証フロー
- ファイル操作API
- React 統合例
- トラブルシューティング

**対象**: Webアプリケーション開発者

**読むべきセクション**:
1. インストール
2. クイックスタート
3. 使用例（React）

---

### 🖥️ サーバー管理者向け

#### [SERVER_GUIDE.md](./SERVER_GUIDE.md) - **サーバー管理・運用ガイド**
USSP サーバーをデプロイ・管理する管理者向け。

**内容**:
- セットアップ
- ストレージアダプター設定（Local/S3/R2/GDrive等）
- OAuth クライアント登録
- ユーザー・権限管理
- バックアップ管理
- セキュリティベストプラクティス
- トラブルシューティング

**対象**: インフラ管理者、DevOps エンジニア

**読むべきセクション**:
1. セットアップ
2. ストレージアダプター設定
3. セキュリティ

---

### 🔧 AI・実装者向け

#### [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md) - **AI実装者向け技術仕様**
AI アシスタント（Claude, ChatGPT等）が新機能を実装する際のリファレンス。

**内容**:
- プロジェクト構成
- 実装済み機能の詳細
- 未実装機能のスペック
- 実装上の注意点
- コーディング規約
- テスト戦略

**対象**: AI アシスタント、バックエンド開発者

**読むべきセクション**:
1. プロジェクト構成
2. 未実装機能
3. コーディング規約

---

### 📋 仕様・設計書

#### [SPECIFICATION.md](./SPECIFICATION.md) - **全機能仕様書**
USSP の全体仕様と実装状況をまとめたドキュメント。

**内容**:
- プロジェクト概要
- 基本機能一覧
- 技術アーキテクチャ
- API 仕様（全エンドポイント）
- OAuth 認証フロー
- 実装状況チェック

**対象**: 企画・設計者、技術選定者

**読むべきセクション**:
1. 概要
2. 基本機能一覧
3. API 仕様

---

#### [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - **実装進捗表**
企画書の要件 vs 実装状況の詳細チェックリスト。

**内容**:
- 企画書 vs 実装状況（一覧表）
- 実装完了機能の詳細
- 部分実装機能の状態
- 未実装機能リスト
- 次のアクション
- 優先度別 TODO

**対象**: プロジェクトマネージャー、技術リード

**読むべきセクション**:
1. 企画書 vs 実装状況
2. 次のアクション

---

## 🚀 クイックスタート

### Web アプリ開発者

```bash
# 1. SDK をインストール
npm install ussp-sdk

# 2. SDK_GUIDE.md の「クイックスタート」を参照
# → 接続先設定・ログイン・ファイル操作
```

**参照**: [SDK_GUIDE.md](./SDK_GUIDE.md#クイックスタート)

---

### サーバー管理者

```bash
# 1. セットアップ
npm run setup
npm run dev

# 2. OAuth クライアント登録
# → SERVER_GUIDE.md の「OAuth クライアント管理」を参照

# 3. ストレージ設定
# → SERVER_GUIDE.md の「ストレージアダプター設定」を参照
```

**参照**: [SERVER_GUIDE.md](./SERVER_GUIDE.md#セットアップ)

---

### AI・開発者（新機能実装）

```bash
# 1. IMPLEMENTATION_NOTES.md で構成を理解
# 2. 実装予定の機能を確認
# 3. コーディング規約に従って実装
```

**参照**: [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md#実装上の注意)

---

## 📖 用途別ガイド

### シナリオ1: Web アプリで USSP を使いたい

→ **[SDK_GUIDE.md](./SDK_GUIDE.md)** を読む

1. インストール
2. 初期化
3. OAuth ログイン
4. ファイルアップロード・ダウンロード
5. React での利用例

---

### シナリオ2: USSP サーバーを立てたい

→ **[SERVER_GUIDE.md](./SERVER_GUIDE.md)** を読む

1. セットアップ
2. ストレージ選択（Local/S3/など）
3. ユーザー作成
4. 各種ログ確認
5. OAuth クライアント（ClientSpace）登録
6. ネームスペースの保存先ストレージ選択
7. セキュリティ設定

---

### シナリオ3: 新機能を実装したい

→ **[IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md)** を読む

1. プロジェクト構成の理解
2. 実装予定機能の仕様確認
3. コーディング規約に従う
4. テスト実装

---

### シナリオ4: 実装状況を確認したい

→ **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** を読む

- 企画書の要件は何が実装されているか
- 何が未実装か
- 次のアクションは何か

---

## 🔗 関連リンク

### プロジェクト

- [GitHub Repository](https://github.com/yourusername/ussp)
- [npm Package](https://www.npmjs.com/package/ussp-sdk)
- [Official Website](https://ussp-project.com)

### 外部ドキュメント

- [OAuth 2.0 仕様](https://tools.ietf.org/html/rfc6749)
- [PKCE 仕様](https://tools.ietf.org/html/rfc7636)
- [Express.js ドキュメント](https://expressjs.com/)
- [Drizzle ORM ドキュメント](https://orm.drizzle.team/)

---

## ❓ よくある質問

### Q: どのドキュメントから読み始めるべき？

A: あなたの役割で選んでください：

- **Web開発者**: [SDK_GUIDE.md](./SDK_GUIDE.md)
- **サーバー管理者**: [SERVER_GUIDE.md](./SERVER_GUIDE.md)
- **AI・実装者**: [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md)
- **プロジェクト管理**: [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)

---

### Q: S3/Google Drive はサポートされている？

A: 現在はサポート中です：

- **Local ストレージ**: ✅ 実装済み
- **S3**: 📋 実装予定（HIGH優先度）
- **Google Drive**: 📋 実装予定（MEDIUM優先度）

詳細は [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md#ストレージアダプター追加) を参照。

---

### Q: SDK はいつリリース？

A: 現在開発中です。進捗は [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md#javascriptsdk) で確認できます。

---

### Q: 本番環境デプロイメントは？

A: [SERVER_GUIDE.md](./SERVER_GUIDE.md#デプロイメント) で本番環境の設定方法を説明しています。

---

## 📝 ドキュメント管理

### 更新履歴

| 日付 | 更新内容 | 更新者 |
|------|--------|--------|
| 2024-01-15 | 初版作成 | AI Assistant |
| - | - | - |

### 貢献方法

ドキュメント改善のプルリクエスト大歓迎です。

```bash
# 1. フォーク
git clone https://github.com/yourusername/ussp.git

# 2. ブランチ作成
git checkout -b docs/improvement

# 3. 編集・コミット
git add docs/
git commit -m "docs: 説明を改善"

# 4. プッシュ・PR
git push origin docs/improvement
```

---

## 📞 サポート

### 問題報告

GitHub Issues: https://github.com/yourusername/ussp/issues

### 機能リクエスト

GitHub Discussions: https://github.com/yourusername/ussp/discussions

### セキュリティ問題

security@ussp-project.com に報告（非公開）

---

**最終更新**: 2024-01-15  
**ドキュメント版**: 1.0.0
