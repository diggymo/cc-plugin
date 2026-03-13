# google-drive-markdown-editor

Google Drive の Markdown ファイルをブラウザで編集できる Web アプリ。

- Google Drive の「アプリで開く」から直接 .md ファイルを開ける
- 左にエディタ（CodeMirror）、右にリアルタイムプレビューの分割画面
- 入力停止 2 秒後に Google Drive へ自動保存
- Hono バックエンドを AWS Lambda にデプロイ

---

## アーキテクチャ

```
Browser (React SPA)
    ↓ HTTP
AWS Lambda (Hono) ← Lambda Function URL
    ↓ googleapis
Google Drive API
```

Lambda が React SPA の静的ファイルも配信するため、S3 等の追加インフラは不要。

---

## セットアップ

### 1. Google Cloud Console の設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. **Google Drive API** を有効化：APIs & Services → Library → Google Drive API → 有効にする
3. **OAuth 同意画面** を設定：APIs & Services → OAuth consent screen
   - スコープに `https://www.googleapis.com/auth/drive.file` を追加
4. **OAuth 認証情報** を作成：APIs & Services → Credentials → OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs に追加：`https://<YOUR_LAMBDA_URL>/api/auth/callback`
5. **Drive アプリ登録**：APIs & Services → Drive SDK → 設定
   - Application name: `Drive Markdown Editor`（任意）
   - Open URL: `https://<YOUR_LAMBDA_URL>/?state={state}`
   - Default MIME types: `text/markdown`
   - Default file extensions: `md`

### 2. 依存関係のインストール

```bash
cd plugins/google-drive-markdown-editor
pnpm install
```

### 3. Lambda へデプロイ

> AWS CLI と AWS SAM CLI がインストール済みであること

```bash
# 環境変数を設定
export GOOGLE_CLIENT_ID=your_client_id
export GOOGLE_CLIENT_SECRET=your_client_secret
export SESSION_SECRET=$(openssl rand -base64 32)

# 初回デプロイ（対話式でスタック名・リージョン等を設定）
pnpm run deploy:guided
```

デプロイ完了後に表示される **Lambda Function URL** を控えておく。

### 4. OAuth リダイレクト URI を更新

デプロイで発行された URL を Google Cloud Console の OAuth 認証情報に追加：
- `https://<LAMBDA_URL>/api/auth/callback`

また Drive SDK の Open URL も更新：
- `https://<LAMBDA_URL>/?state={state}`

---

## ローカル開発

```bash
# ターミナル1: バックエンド起動 (port 3000)
cd plugins/google-drive-markdown-editor
pnpm run dev:backend

# ターミナル2: フロントエンド起動 (port 5173)
pnpm run dev:frontend
```

`.env` ファイルを `backend/` に作成：

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
SESSION_SECRET=any-random-string
APP_URL=http://localhost:3000
```

ブラウザで `http://localhost:5173` を開く。

---

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `GOOGLE_CLIENT_ID` | Google Cloud Console で取得した OAuth クライアント ID |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console で取得した OAuth クライアントシークレット |
| `SESSION_SECRET` | JWT 署名キー（`openssl rand -base64 32` で生成） |
| `APP_URL` | デプロイ先 URL（Lambda Function URL） |

---

## 使い方

### Google Drive から開く

1. Google Drive で .md ファイルを右クリック
2. 「アプリで開く」→「Drive Markdown Editor」を選択
3. 初回はログインが必要（Google アカウントで認証）
4. エディタが開き、左にコード、右にプレビューが表示される
5. 編集すると 2 秒後に自動保存される

### 直接アクセス

`https://<LAMBDA_URL>` にアクセスするとファイル一覧が表示される。

---

## スタック

| 役割 | ライブラリ |
|------|-----------|
| バックエンド | [Hono](https://hono.dev/) v4 |
| デプロイ | AWS Lambda + Lambda Function URL |
| 認証 | Google OAuth 2.0 (カスタム実装) |
| セッション | JWT (`jose`) in httpOnly Cookie |
| Drive API | `googleapis` |
| フロントエンド | React 18 + Vite |
| エディタ | CodeMirror 6 |
| プレビュー | react-markdown + remark-gfm |
