# React Member Hub (PoC)

会員制コミュニティアプリの **動作確認用 PoC**。ユーザー登録から簡単なコミュニティ機能までを一通り触れるようにしたもの。

**単一 `package.json`** 構成：ルートに Vite/React クライアント、`server/` に Express + MongoDB API。`tsx` でサーバーを直接実行（ビルド不要）。

## 機能（PoC 範囲）

| 機能 | 実装 |
|---|---|
| 会員登録／ログイン | メール＋パスワード、JWT（`server/routes/auth.ts`）。登録時に6桁コードでメール認証（未認証はログイン不可） |
| プロフィール | 表示名／自己紹介／アイコンURL 編集（`/profile`） |
| お知らせ配信 | 一覧・詳細。作成は管理者のみ（`server/routes/announcements.ts`） |
| イベント情報 | 開催予定／すべて 切替（`server/routes/events.ts`） |
| コミュニティ投稿 | フィード、投稿作成、タグ、公開/会員限定 |
| コメント／リアクション | 投稿詳細でコメント・👍🎉💪。カウンタは `$inc` で更新 |
| おすすめコンテンツ | `isRecommended` 枠（`/contents`） |
| 動画／音声閲覧 | `<video>` / `<audio>` で URL 再生 |
| 会員限定コンテンツ | `visibility: public / members / premium`。ロック時は url を返さない |
| 検索 | 投稿本文の部分一致（`$regex`、PoC 用の簡易版） |

**メール認証**: 登録時に6桁の確認コードを送信（`server/services/emailService.ts`。Resend 使用、`RESEND_API_KEY` 未設定時はサーバーのコンソールにコード出力）。認証が済むまでログイン不可。

**未実装（本開発フェーズ）**: 画像アップロード基盤、日本語全文検索（Atlas Search / Meilisearch）、パスワードリセット、プッシュ通知、管理画面、モデレーション。

## セットアップ

```bash
# 1) 依存インストール
npm install

# 2) 環境変数
cp .env.example .env      # 必要なら JWT_SECRET などを編集

# 3) MongoDB を起動（ローカルの例）
#   brew services start mongodb-community
#   もしくは MongoDB Atlas の URI を .env の MONGODB_URI に設定

# 4) シードデータ投入
npm run seed

# 5) 起動（API:8000 / client:5173 を同時起動）
npm run dev:full
```

ブラウザで http://localhost:5173 を開く。

### シードアカウント（パスワードはすべて `password123`）

| メール | 役割 |
|---|---|
| `admin@example.com` | 管理者・有料会員 |
| `member@example.com` | 一般・無料会員 |
| `premium@example.com` | 一般・有料会員 |

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | クライアントのみ（Vite） |
| `npm run dev:server` | API のみ（tsx watch） |
| `npm run dev:full` | 両方同時 |
| `npm run seed` | DB リセット＋サンプル投入 |
| `npm run typecheck` / `typecheck:server` | 型チェック |
| `npm run build` | クライアントを `dist/` にビルド |

## ディレクトリ

```
.
├── App.tsx / main.tsx / index.html   … Vite React エントリ
├── pages/        … 画面（Feed, PostDetail, Announcements, Events, Contents, Profile, Login, Register）
├── components/   … Layout, ProtectedRoute
├── contexts/     … AuthContext（JWT を localStorage 保持）
├── lib/api.ts    … axios インスタンス＋APIの型
└── server/
    ├── server.ts        … Express エントリ
    ├── config/          … env, db
    ├── middleware/       … auth（requireAuth / optionalAuth / requireAdmin）
    ├── lib/              … jwt, validate（zod）
    ├── models/           … User, Post, Comment, Reaction, Announcement, Event, Content
    ├── routes/           … auth, users, posts, announcements, events, contents
    └── seed.ts
```

## API 概要

- `POST /api/auth/register` `{ email, password, displayName }` → `{ needsVerification: true, email }`（dev は `devCode` も）
- `POST /api/auth/verify-email` `{ token }` → `{ ok: true }`
- `POST /api/auth/resend-verification` `{ email }` → `{ ok: true }`
- `POST /api/auth/login` `{ email, password }` → `{ token, user }`（未認証は 403 `email_unverified`）
- `GET  /api/auth/me`
- `PATCH /api/users/me` / `POST /api/users/me/upgrade` / `downgrade`
- `GET  /api/posts?q=&tag=&page=` / `POST /api/posts`
- `GET/DELETE /api/posts/:id`
- `GET/POST /api/posts/:id/comments`
- `POST/DELETE /api/posts/:id/reactions` `{ type }`
- `GET /api/announcements` `/:id`（作成・削除は admin）
- `GET /api/events?scope=upcoming|all` `/:id`（作成・削除は admin）
- `GET /api/contents?type=&recommended=true` `/:id`（作成・削除は admin）
