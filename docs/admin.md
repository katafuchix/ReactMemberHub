# 管理画面 (admin/)

運営向けの管理画面。Next.js (App Router) の独立アプリとして `admin/` に置き、データは既存の Express API 経由で扱う。
デザインは デジタル庁デザインシステム (DADS) のトークンを使った左サイドバー型レイアウト（`admin/app/globals.css`）。

## 構成

```
admin/                    独立した package.json を持つ Next.js 16 アプリ (port 3001)
├─ app/(auth)/login       ログイン画面 + Server Action (actions.ts)
├─ app/(dashboard)/       サイドバー付きレイアウト (管理者のみ)
│   ├─ page.tsx           ダッシュボード (会員・投稿の概況)
│   └─ users/page.tsx     ユーザー一覧 (検索・会員種別フィルタ・ページ送り)
├─ components/layout/     Sidebar
├─ components/ui/         Button / Input
├─ lib/api.ts             Express API クライアント (サーバー専用)
├─ lib/session.ts         管理者セッション確認
└─ proxy.ts               Cookie 無しは /login へ
server/routes/admin.ts    管理者専用 API (/api/admin/*)
```

## 認証の流れ

1. `/login` のフォームを Server Action が受け、Express の `POST /api/auth/login` を呼ぶ。
2. 返ってきた `user.role` が `admin` でなければ **Cookie を保存せず**エラーにする。
3. JWT は `memberhub_admin_token`（httpOnly / SameSite=Lax / 本番は Secure / 7日）に保存する。ブラウザの JS からは読めない。
4. 以降、サーバーコンポーネントが Cookie のトークンを `Authorization: Bearer` に付けて Express を呼ぶ（BFF 方式）。ブラウザから Express へ直接は通信しないので CORS 設定は不要。
5. 権限の最終判定は Express の `requireAuth` + `requireAdmin`。画面側の判定 (`requireAdminSession`) は導線用。

| 状態 | 結果 |
|---|---|
| Cookie 無し | `proxy.ts` が `/login` へリダイレクト |
| 一般会員のトークン | `/login?error=forbidden` へリダイレクト、API は 403 |
| トークン不正・期限切れ | `/login` へリダイレクト |

## API（すべて管理者のみ）

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/api/admin/stats` | 会員数・有料会員数・未認証数・直近7日の新規・投稿数・コメント数・最近の登録ユーザー5件 |
| GET | `/api/admin/users?q=&membership=&page=1&limit=20` | ユーザー一覧。`q` は表示名・メールの部分一致、`membership` は `free` / `premium`。`limit` は最大100 |

管理画面向けの整形（`adminUser`）は email を含むが `passwordHash` / 認証トークンは含まない。
未ログインは 401 `unauthorized`、管理者以外は 403 `forbidden`。

## 起動方法

```bash
# 1) API (8000) と既存クライアント (5173)
npm run dev:full

# 2) 管理画面 (3001)
cd admin
npm install
cp env.example .env.local   # API_BASE_URL (既定 http://localhost:8000/api)
npm run dev
```

http://localhost:3001 を開き、シードの管理者（`admin@example.com` / `password123`、`npm run seed` で投入）でログインする。

型チェック: `cd admin && npm run typecheck`

## 環境変数 (admin/.env.local)

| 名前 | 既定 | 内容 |
|---|---|---|
| `API_BASE_URL` | `http://localhost:8000/api` | Express API のベースURL。サーバー側からのみ参照され、ブラウザには公開されない |

## 今後の拡張（未実装）

- ユーザー管理: ロール・会員種別の変更、利用停止（`User` に `status` の追加が必要）
- コンテンツ管理: お知らせ・イベント・コンテンツの CRUD（現状は作成 API が無いものがある）
- モデレーション: 投稿・コメントの削除、通報（`Report` モデルの新設）
- 操作ログ（監査ログ）

## 補足

- ルートの `package.json`（クライアント + API）とは別に依存を持つ。ルートで `npm install` しても `admin/` は入らない。
- ルートの `typecheck` は `admin/` を対象にしない（`tsconfig.json` の `include` が限定されているため）。
