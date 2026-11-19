# ユーザー退会（論理削除）

issue #11 / PR #12。ユーザーの退会を**論理削除**で実現する。データは消さず、ログインと表示だけを止める。
退会は本人（プロフィール画面）と管理者（管理画面）の両方から行え、管理画面からは復帰もできる。

---

## 仕様サマリ

| 項目 | 内容 |
|---|---|
| 削除方式 | 論理削除（`deletedAt` に退会日時を入れる）。物理削除はしない |
| 対象データ | `User` と、そのユーザーの `Post` / `Comment` / `Reaction` |
| 対象外 | `Event` / `Announcement` / `Content`（ユーザー参照を持たない） |
| 退会後 | ログイン不可・既存トークン無効・公開プロフィール 404・確認コード再送なし |
| 再登録 | 同じメールで新規登録すると**別レコード**になる |
| 復帰 | 管理画面から可能。退会時に論理削除したデータも元に戻る |
| 管理者 | 本人退会は不可。管理画面からも自分自身の退会・権限剥奪は不可 |

---

## データモデル

### `User`（`server/models/User.ts`）

| フィールド | 型 | 説明 |
|---|---|---|
| `deletedAt` | `Date \| null` | 退会日時。`null` / 未設定 = 有効 |
| `deletedEmail` | `string?` | 退会時に退避した元のメール |

退会時、`email` は `deleted+<userId>@deleted.invalid` に差し替える。
これで `email` の unique 制約が空き、同じメールでの再登録が別レコードになる。
管理画面には `deletedEmail`（元のメール）を表示し、検索でも元のメールで当たる。

### `Post` / `Comment` / `Reaction`

`softDeletePlugin`（`server/lib/softDelete.ts`）で `deletedAt` を持つ。

- `find` / `findOne` / `findOneAnd*` / `countDocuments` / `updateOne` / `updateMany` / `deleteOne` / `deleteMany` に、自動で `deletedAt: null` を付与する。既存のルートは修正不要。
- 削除済みも扱うクエリは `.setOptions({ withDeleted: true })` を付ける（復帰処理・`seed` が使用）。
- **`aggregate` と `bulkWrite` は自動除外の対象外。** 使う場合は自分で `deletedAt: null` を付けること（現状は `bulkWrite` をカウンタ更新にのみ使用）。
- `deletedAt: null` は未設定の既存データにも一致するため、**マイグレーションは不要**。

---

## 退会・復帰の処理

実装: `server/services/userLifecycle.ts`（本人退会・管理画面の両方から共通で使う）。

### 退会 `softDeleteUser`

1. `deletedAt = now` をユーザーに設定し、`email` を退避・差し替えて保存
2. ユーザーの `Post` / `Comment` / `Reaction` に**同じ `deletedAt`** を設定
3. 他人の投稿に付けていたコメント・リアクションの分だけ、投稿側の非正規化カウンタ（`commentCount` / `reactionCount`）を減らす

- 他の人が退会者の投稿に付けたコメントは個別には消さない。投稿ごと見えなくなる。
- 途中で失敗しても、同じ退会処理を再実行すれば揃う（設定済みの `deletedAt` を使い回す）。

### 復帰 `restoreUser`

1. 退会後に同じメールで再登録されていたら **409 `email_taken`** で拒否
2. `email` を戻し、`deletedAt` を `null` にする
3. **ユーザーと同じ `deletedAt` のデータだけ**を戻し、カウンタを増やす

退会前から消えていたデータ（個別に削除済みなど）は戻らない。

---

## API

### 本人用（`server/routes/users.ts`）

| メソッド | パス | 内容 |
|---|---|---|
| POST | `/api/users/me/withdraw` | 退会。body: `{ password }`。パスワード不一致は 401 `invalid_password`、管理者は 403 `admin_cannot_withdraw` |

### 管理者用（`server/routes/admin.ts`、すべて `requireAdmin`）

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/api/admin/users?status=` | 一覧。`status` は `active`（既定）/ `deleted` / `all` |
| GET | `/api/admin/users/:id` | 詳細（投稿数・コメント数つき） |
| PATCH | `/api/admin/users/:id` | 表示名・自己紹介・アバターURL・会員種別・権限・メール認証の更新。退会済みは 409 `user_deleted`、自分自身の `member` 化は 400 `cannot_demote_self` |
| DELETE | `/api/admin/users/:id` | 退会（論理削除）。自分自身は 400 `cannot_delete_self` |
| POST | `/api/admin/users/:id/restore` | 復帰 |

### 退会済みユーザーの扱い

- `requireAuth` / `optionalAuth`: 退会済みのトークンは無効（401）
- `POST /api/auth/login`: 存在しない場合と同じ `invalid_credentials`（退会の有無を漏らさない）
- `GET /api/users/:id` と `/:id/posts`: 404
- `POST /api/auth/resend-verification`: 何もしない
- `GET /api/admin/stats`: 集計から除外

---

## 画面

### 管理画面（`admin/`）

- `/users`: 表示名から詳細へ遷移。「有効なユーザー / 退会済み / すべて」の絞り込みと「退会済み」バッジ
- `/users/[id]`: ユーザー情報の編集フォーム、退会（確認ステップ付き）・復帰ボタン。退会済みはフォームを無効化
  - `actions.ts`（Server Action）/ `UserEditForm.tsx` / `DeleteUserButton.tsx` / `page.tsx`

### ユーザー画面（`pages/Profile.tsx`）

- 「退会」セクション。「退会する」→ パスワード入力 →「退会を実行」
- 成功するとログアウトして `/login` へ。管理者アカウントには表示しない

---

## 運用上の注意

- `npm run seed` は削除済みも含めて全レコードを消す（`withDeleted` 指定）。
- MongoDB のトランザクションは使っていない。退会が途中で失敗した場合は再実行で揃うが、カウンタが少しずれる可能性がある。
- 投稿者本人による**投稿の削除は従来どおり物理削除**（`DELETE /api/posts/:id`）。

## 今後の課題

- 退会ユーザーの投稿などの完全削除（物理削除）が必要になった場合のバッチ・保持期間の設計
- 退会理由の記録、退会通知メール
- 投稿削除の論理削除化
