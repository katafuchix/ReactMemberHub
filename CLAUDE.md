# CLAUDE.md

会員制コミュニティアプリの PoC。Mac / スマホ（Claude アプリ）どちらからでも開発できるようにしている。

## 構成

- **単一 `package.json`**、`type: module`。ルートが Vite/React クライアント、`server/` が Express + MongoDB API。
- クライアント: React 18 + Vite + TypeScript + Tailwind + React Router + TanStack Query。
- サーバー: Express + Mongoose(MongoDB) + JWT + zod。`tsx` で直接実行（ビルド不要）。
- 認証は JWT を `localStorage`（`memberhub.token`）に保持し、axios interceptor で `Authorization: Bearer` を付与。

## 開発コマンド

- `npm run dev:full` — API(8000) と client(5173) を同時起動
- `npm run seed` — DB をリセットしてサンプル投入
- `npm run typecheck && npm run typecheck:server` — 型チェック
- Vite は `/api` を `http://localhost:8000` にプロキシする（`vite.config.ts`）

## 規約

- サーバーの import は拡張子なし（`moduleResolution: Bundler` + tsx）。
- ルートハンドラは早期 return スタイル（`res.status(...).json(...); return;`）。
- 認可: `requireAuth` / `optionalAuth` / `requireAdmin`（`server/middleware/auth.ts`）。
- 投稿削除時は `Comment` と `Reaction` もアプリ層でカスケード削除する（`server/routes/posts.ts` 参照）。
- コメント/リアクション数は `Post.commentCount` / `reactionCount` に非正規化。増減を忘れない。
- レスポンスのユーザー整形は `publicUser` / `profileUser`（`server/models/User.ts`）。

## PoC の割り切り（本実装では要対応）

- 検索は `$regex` の部分一致のみ。日本語全文検索は Atlas Search か Meilisearch を別途。
- 画像・動画・音声は URL 直指定。アップロード基盤なし。
- メール認証・パスワードリセット・プッシュ通知・管理画面・モデレーションは未実装。
- `POST /api/users/me/upgrade` は決済なしのダミー。
