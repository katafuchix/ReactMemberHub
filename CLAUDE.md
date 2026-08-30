# CLAUDE.md

会員制コミュニティアプリの PoC。Mac / スマホ（Claude アプリ）どちらからでも開発できるようにしている。

## 構成

- **単一 `package.json`**、`type: module`。ルートが Vite/React クライアント、`server/` が Express + MongoDB API。
- クライアント: React 18 + Vite + TypeScript + Tailwind + React Router + TanStack Query。
- サーバー: Express + Mongoose(MongoDB) + JWT + zod。`tsx` で直接実行（ビルド不要）。
- 認証は JWT を `localStorage`（`memberhub.token`）に保持し、axios interceptor で `Authorization: Bearer` を付与。
- 新規登録はメール認証（6桁コード）必須。未認証ユーザーの `POST /api/auth/login` は 403 `email_unverified`。コード送信は `server/services/emailService.ts`（Resend。`RESEND_API_KEY` 未設定時はコンソール出力にフォールバック）。

## 開発コマンド

- `npm run dev:full` — API(8000) と client(5173) を同時起動
- `npm run seed` — DB をリセットしてサンプル投入
- `npm run typecheck && npm run typecheck:server` — 型チェック
- Vite は `/api` を `http://localhost:8000` にプロキシする（`vite.config.ts`）

## モバイル (Capacitor)

詳細は [`docs/capacitor.md`](docs/capacitor.md)。

- クライアント (`dist`) を Capacitor でネイティブ化。`capacitor.config.ts` / `android/` / `ios/` を追加済み。サーバーはリモート API のまま。
- bundle id: production = `net.deskplate.memberhub` / staging = `net.deskplate.memberhub.dev`。アプリ名はどちらも `Member Hub`。
  - Android: `android/app/build.gradle` の productFlavors `production` / `dev`（`dev` は `applicationIdSuffix ".dev"`）。`assembleDevDebug` / `assembleProductionRelease`。
  - iOS: **Debug ビルド = `.dev`（staging）／ Release ビルド = production**（`ios/App/App.xcodeproj/project.pbxproj` の App target 設定）。Release 型の staging 配信が必要になったら Xcode に Staging configuration + scheme を追加する。
- API 接続先は環境別 Vite mode で切替: `.env.staging` / `.env.production` の `VITE_API_BASE_URL`（絶対URL必須。ネイティブに proxy は無い）。
  - `npm run cap:sync:staging` / `npm run cap:sync:production` でビルド＋sync。`npm run cap:ios` / `cap:android` で IDE を開く。
- サーバー CORS は `CLIENT_ORIGIN` をカンマ区切り複数対応（`server/config/env.ts` の `CLIENT_ORIGINS`）。ネイティブ用に `capacitor://localhost`(iOS) / `https://localhost`(Android) を許可。
- 実機ライブリロードは `capacitor.config.ts` の `server.url` に dev マシンの Vite URL を設定（+ `cleartext: true`）。

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
- メール認証は実装済み（6桁コード / Resend、キー未設定時はコンソール出力）。パスワードリセット・プッシュ通知・管理画面・モデレーションは未実装。
- `POST /api/users/me/upgrade` は決済なしのダミー。
