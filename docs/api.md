# API リファレンス

Express サーバー（`server/`）の REST API。ベース URL は開発時 `http://localhost:8000`、すべて `/api` 配下。
Vite（5173）は `/api` を 8000 にプロキシする。ネイティブ（Capacitor）は `VITE_API_BASE_URL` の絶対 URL を使う。

- 形式: JSON（`Content-Type: application/json`、リクエストボディ上限 1MB）
- 実装: `server/routes/*.ts`（ルート定義は `server/server.ts`）
- 管理画面専用 API の詳細は [`admin.md`](admin.md)、退会まわりの仕様は [`user-withdrawal.md`](user-withdrawal.md) も参照

---

## 共通事項

### 認証

`Authorization: Bearer <JWT>` ヘッダーで送る。JWT は `POST /api/auth/login` で発行（有効期限は `JWT_EXPIRES_IN`、既定 `7d`）。

| 表記 | 意味 |
|---|---|
| 公開 | 認証不要 |
| 任意 | ログインしていれば `req.user` をセット。未ログインでも通る（トークンが不正でも匿名扱い） |
| 要ログイン | 未ログイン・トークン不正・退会済みは 401 `unauthorized` |
| 管理者 | 要ログイン + `role === 'admin'`。それ以外は 403 `forbidden` |

退会済みユーザー（`deletedAt` あり）のトークンは無効（401）。

### エラー形式

```json
{ "error": "error_code" }
```

| status | 意味 |
|---|---|
| 400 | `validation_error`（zod 検証エラー。`details` に `flatten()` の結果）/ `invalid_id` など |
| 401 | `unauthorized` / `invalid_credentials` など |
| 403 | `forbidden` / `locked` / `email_unverified` など |
| 404 | `not_found`（未定義のパスも同じ） |
| 409 | `email_taken` など |
| 500 | `internal_error` |

### ページネーション

一覧系で共通。クエリ `page`（既定 1）と `limit`。

```json
{ "items": [], "total": 0, "page": 1, "limit": 20, "hasMore": false }
```

### ID

MongoDB の ObjectId（24桁 hex）。形式が不正なら 400 `invalid_id`。
ユーザーは `id`、投稿・コメントなど Mongoose の生ドキュメントを返すものは `_id` で返る（下記の各レスポンス参照）。

---

## ヘルス

| メソッド | パス | 認証 | 内容 |
|---|---|---|---|
| GET | `/api/health` | 公開 | `{ ok: true, env, time }` |

---

## 認証 `/api/auth`

| メソッド | パス | 認証 | 内容 |
|---|---|---|---|
| POST | `/api/auth/register` | 公開 | 新規登録（メール認証が必要） |
| POST | `/api/auth/verify-email` | 公開 | 6桁コードでメール認証 |
| POST | `/api/auth/resend-verification` | 公開 | 確認コード再送 |
| POST | `/api/auth/login` | 公開 | ログイン（JWT 発行） |
| GET | `/api/auth/me` | 要ログイン | ログイン中のユーザー |

### POST `/api/auth/register`

```json
{ "email": "a@example.com", "password": "8〜100文字", "displayName": "1〜60文字" }
```

- 201: `{ "needsVerification": true, "email": "...", "devCode": "123456" }`
  - `devCode` は開発系環境（`isDevLike()`）のときだけ含まれる
  - 認証が済むまで JWT は発行しない（自動ログインしない）
- 409 `email_taken`: 同じメールの有効ユーザーがいる。退会済みユーザーのメールは退避されるため、**退会済みメールでの再登録は成功し別レコードになる**
- 502 `email_send_failed`: 確認メール送信失敗（作成したユーザーは削除される）

### POST `/api/auth/verify-email`

```json
{ "token": "123456" }
```

- 200: `{ "ok": true }`（認証済みなら `alreadyVerified: true` も付く）
- 400 `invalid_token` / `token_expired`（有効期限 `EMAIL_VERIFICATION_TTL_MIN`、既定 60 分）

### POST `/api/auth/resend-verification`

```json
{ "email": "a@example.com" }
```

- 200: `{ "ok": true }`（開発系は `devCode` も）。ユーザーの存在有無・退会済み・認証済みかは伏せ、対象外のときは何もせず 200 を返す
- 502 `email_send_failed`

### POST `/api/auth/login`

```json
{ "email": "a@example.com", "password": "..." }
```

- 200: `{ "token": "<JWT>", "user": <User> }`
- 401 `invalid_credentials`: メール・パスワード不一致、**退会済みも同じ応答**（退会の有無を漏らさない）
- 403 `email_unverified`: メール認証が未完了

### GET `/api/auth/me`

- 200: `{ "user": <User> }`

---

## ユーザー `/api/users`

| メソッド | パス | 認証 | 内容 |
|---|---|---|---|
| PATCH | `/api/users/me` | 要ログイン | 自分のプロフィール更新 |
| POST | `/api/users/me/upgrade` | 要ログイン | 有料会員にする（**PoC ダミー**、決済なし） |
| POST | `/api/users/me/downgrade` | 要ログイン | 無料会員に戻す（PoC ダミー） |
| POST | `/api/users/me/withdraw` | 要ログイン | 退会（論理削除） |
| GET | `/api/users/:id` | 公開 | 他ユーザーの公開プロフィール |
| GET | `/api/users/:id/posts` | 任意 | 指定ユーザーの投稿一覧 |

### PATCH `/api/users/me`

```json
{ "displayName": "1〜60文字", "bio": "500文字以内", "avatarUrl": "https://... または空文字" }
```

すべて任意。200: `{ "user": <User> }`

### POST `/api/users/me/withdraw`

```json
{ "password": "現在のパスワード" }
```

- 200: `{ "ok": true }`
- 401 `invalid_password`: パスワード不一致
- 403 `admin_cannot_withdraw`: 管理者は本人退会不可（管理画面側で行う）

退会後は、ユーザーと本人の投稿・コメント・リアクションが論理削除される。詳細は [`user-withdrawal.md`](user-withdrawal.md)。

### GET `/api/users/:id`

200: `{ "user": <PublicProfile> }`。存在しない・退会済みは 404 `not_found`。

### GET `/api/users/:id/posts?page=1&limit=20`

- `limit` は最大 50。未ログインは `visibility: public` のみ、ログイン済みは `members` 限定投稿も含む
- 200: ページネーション形式（`items` は [Post](#post)）
- 存在しない・退会済みユーザーは 404

---

## 投稿 `/api/posts`

| メソッド | パス | 認証 | 内容 |
|---|---|---|---|
| GET | `/api/posts` | 任意 | 投稿一覧（新しい順） |
| POST | `/api/posts` | 要ログイン | 投稿作成 |
| GET | `/api/posts/:id` | 任意 | 投稿詳細 |
| DELETE | `/api/posts/:id` | 要ログイン | 投稿削除（投稿者本人 or 管理者） |
| GET | `/api/posts/:id/comments` | 任意 | コメント一覧（古い順） |
| POST | `/api/posts/:id/comments` | 要ログイン | コメント投稿 |
| POST | `/api/posts/:id/reactions` | 要ログイン | リアクション付与 |
| DELETE | `/api/posts/:id/reactions` | 要ログイン | リアクション取り消し |

### GET `/api/posts?tag=&q=&page=1&limit=20`

- `tag`: タグ完全一致 / `q`: 本文の部分一致（正規表現、PoC 用の簡易検索） / `limit` は最大 50
- 未ログインは `visibility: public` のみ
- 200: ページネーション形式。`items[].author` は `{ _id, displayName, avatarUrl, membership }` に populate 済み

### POST `/api/posts`

```json
{
  "body": "1〜2000文字",
  "imageUrls": ["https://..."],
  "tags": ["最大6件、各1〜24文字"],
  "visibility": "public | members"
}
```

`body` のみ必須（`imageUrls` は最大 4 件、`visibility` 既定は `members`）。201: `{ "post": <Post> }`

### GET `/api/posts/:id`

200: `{ "post": <Post> }`（`author` に `bio` も含む）。
`members` 限定投稿を未ログインで見ると 401 `members_only`。存在しない・論理削除済みは 404。

### DELETE `/api/posts/:id`

投稿者本人か管理者のみ（それ以外は 403 `forbidden`）。**物理削除**で、子のコメント・リアクションも削除する。200: `{ "ok": true }`

### POST `/api/posts/:id/comments`

```json
{ "body": "1〜1000文字" }
```

201: `{ "comment": <Comment> }`。`Post.commentCount` を +1 する。

### POST / DELETE `/api/posts/:id/reactions`

```json
{ "type": "like | celebrate | support" }
```

`type` 既定は `like`。1 ユーザー × 1 投稿 × 1 種別につき 1 件まで（付与済みの再付与は無視）。
200: `{ "ok": true, "reactionCount": <投稿のリアクション総数> }`

---

## お知らせ `/api/announcements`

| メソッド | パス | 認証 | 内容 |
|---|---|---|---|
| GET | `/api/announcements` | 公開 | 公開中の一覧（ピン留め優先、公開日の新しい順） |
| GET | `/api/announcements/:id` | 公開 | 詳細（`published` のみ。下書きは 404） |
| POST | `/api/announcements` | 管理者 | 作成 |
| DELETE | `/api/announcements/:id` | 管理者 | 削除（物理削除） |

POST の body:

```json
{
  "title": "1〜200文字", "body": "1〜5000文字",
  "imageUrl": "https://... または空文字",
  "pinned": false, "status": "draft | published"
}
```

`title` / `body` が必須（`status` 既定は `published`）。一覧は `{ "items": [...] }`、詳細・作成は `{ "item": {...} }`。

---

## イベント `/api/events`

| メソッド | パス | 認証 | 内容 |
|---|---|---|---|
| GET | `/api/events?scope=upcoming\|all` | 公開 | 公開中の一覧（開始日時の昇順）。既定は終了前のみ、`scope=all` で過去も含む |
| GET | `/api/events/:id` | 公開 | 詳細（`published` のみ） |
| POST | `/api/events` | 管理者 | 作成 |
| DELETE | `/api/events/:id` | 管理者 | 削除（物理削除） |

POST の body:

```json
{
  "title": "1〜200文字", "body": "1〜5000文字",
  "imageUrl": "https://... または空文字", "location": "200文字以内",
  "startAt": "2026-12-01T10:00:00+09:00", "endAt": "2026-12-01T12:00:00+09:00",
  "status": "draft | published"
}
```

`title` / `body` / `startAt` / `endAt` が必須。日時は日付に変換可能な文字列。

---

## コンテンツ `/api/contents`

動画・音声・記事へのリンク。公開範囲は `visibility`。

| `visibility` | 閲覧できる人 |
|---|---|
| `public` | 誰でも |
| `members` | ログイン済み |
| `premium` | 有料会員（`membership: premium`） |

| メソッド | パス | 認証 | 内容 |
|---|---|---|---|
| GET | `/api/contents?type=&recommended=true` | 任意 | 一覧。鍵付きも「ロック状態」で返す |
| GET | `/api/contents/:id` | 任意 | 詳細（権限があるときのみ） |
| POST | `/api/contents` | 管理者 | 作成 |
| DELETE | `/api/contents/:id` | 管理者 | 削除（物理削除） |

### GET `/api/contents`

`type`（`video | audio | article`）と `recommended=true` で絞り込み。200:

```json
{ "items": [{
  "id": "...", "title": "...", "description": "...", "type": "video",
  "thumbnailUrl": "...", "visibility": "premium", "isRecommended": true,
  "locked": true, "url": null
}] }
```

権限がない項目は `locked: true` で `url` が `null`（URL は伏せる）。

### GET `/api/contents/:id`

- 200: `{ "item": {...} }`（`url` を含む）
- 403 `locked` + `reason`: 未ログインは `login_required`、無料会員の `premium` は `premium_required`

### POST `/api/contents`

```json
{
  "title": "1〜200文字", "description": "2000文字以内",
  "type": "video | audio | article", "url": "https://...",
  "thumbnailUrl": "https://... または空文字",
  "visibility": "public | members | premium", "isRecommended": false
}
```

`title` / `type` / `url` が必須（`visibility` 既定は `public`）。

---

## 管理者 `/api/admin`

すべて「管理者」権限が必要。管理画面（`admin/`）が使う。

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/api/admin/stats` | ダッシュボード用の集計 |
| GET | `/api/admin/users` | ユーザー一覧（検索・絞り込み） |
| GET | `/api/admin/users/:id` | ユーザー詳細 |
| PATCH | `/api/admin/users/:id` | ユーザー更新 |
| DELETE | `/api/admin/users/:id` | 退会（論理削除） |
| POST | `/api/admin/users/:id/restore` | 退会の取り消し |

### GET `/api/admin/stats`

退会済みユーザーは集計から除外。

```json
{
  "users": { "total": 0, "premium": 0, "unverified": 0, "new7d": 0 },
  "posts": { "total": 0, "new7d": 0 },
  "comments": { "total": 0 },
  "recentUsers": [<AdminUser>]
}
```

### GET `/api/admin/users?q=&membership=&status=&page=1&limit=20`

| クエリ | 内容 |
|---|---|
| `q` | 表示名・メール（退会済みは元のメール）の部分一致 |
| `membership` | `free` / `premium` |
| `status` | `active`（既定）/ `deleted` / `all` |
| `limit` | 最大 100 |

200: ページネーション形式（`items` は [AdminUser](#adminuser)）

### GET `/api/admin/users/:id`

200: `{ "user": <AdminUser>, "stats": { "postCount": 0, "commentCount": 0 } }`

### PATCH `/api/admin/users/:id`

```json
{
  "displayName": "1〜60文字", "bio": "500文字以内", "avatarUrl": "https://... または空文字",
  "role": "member | admin", "membership": "free | premium", "emailVerified": true
}
```

すべて任意。200: `{ "user": <AdminUser> }`

- 400 `cannot_demote_self`: 自分自身を `member` にはできない
- 409 `user_deleted`: 退会済みは編集不可（先に復帰する）

### DELETE `/api/admin/users/:id`

論理削除（ユーザー + 投稿・コメント・リアクション）。200: `{ "user": <AdminUser> }`。400 `cannot_delete_self`。

### POST `/api/admin/users/:id/restore`

復帰（退会時に論理削除したデータも戻す）。200: `{ "user": <AdminUser> }`。
退会後に同じメールで再登録されている場合は 409 `email_taken`。

---

## レスポンスのオブジェクト

### User

`publicUser`（`server/models/User.ts`）。自分自身の情報用。

```json
{
  "id": "...", "email": "...", "displayName": "...", "avatarUrl": "", "bio": "",
  "role": "member | admin", "membership": "free | premium",
  "emailVerified": true, "createdAt": "2026-01-01T00:00:00.000Z"
}
```

### PublicProfile

`profileUser`。他人のプロフィール用（メール・権限は含めない）。

```json
{ "id": "...", "displayName": "...", "avatarUrl": "", "bio": "", "membership": "free", "createdAt": "..." }
```

### AdminUser

管理画面用。メールを含み、パスワードハッシュ等は含めない。退会済みは元のメールを返す。

```json
{
  "id": "...", "email": "...", "displayName": "...", "avatarUrl": "", "bio": "",
  "role": "member", "membership": "free", "emailVerified": true,
  "createdAt": "...", "deletedAt": null
}
```

`deletedAt` は退会済みなら退会日時（ISO 8601）。

### Post

```json
{
  "_id": "...",
  "author": { "_id": "...", "displayName": "...", "avatarUrl": "", "membership": "free" },
  "body": "...", "imageUrls": [], "tags": [], "visibility": "members",
  "commentCount": 0, "reactionCount": 0,
  "createdAt": "...", "updatedAt": "..."
}
```

`commentCount` / `reactionCount` は非正規化カウンタ（追加・削除のたびに増減する）。

### Comment

```json
{
  "_id": "...", "post": "<postId>",
  "author": { "_id": "...", "displayName": "...", "avatarUrl": "", "membership": "free" },
  "body": "...", "createdAt": "...", "updatedAt": "..."
}
```

---

## PoC の割り切り

- 検索は `$regex` の部分一致のみ（日本語の全文検索は未対応）
- 画像・動画・音声は URL 直指定（アップロード API なし）
- `POST /api/users/me/upgrade` / `downgrade` は決済なしのダミー
- パスワードリセット・プッシュ通知・モデレーションは未実装
