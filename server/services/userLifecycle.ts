import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { Reaction } from '../models/Reaction';

/** User ドキュメント (mongoose の document) */
type UserDoc = any;

type CounterRow = { post: unknown };

/** post ごとの件数に集計して $inc 用の bulkWrite 操作にする */
function counterOps(
  rows: CounterRow[],
  field: 'commentCount' | 'reactionCount',
  sign: 1 | -1,
) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(String(r.post), (m.get(String(r.post)) ?? 0) + 1);
  return [...m].map(([id, n]) => ({
    updateOne: { filter: { _id: id }, update: { $inc: { [field]: sign * n } } },
  }));
}

/**
 * 退会 (論理削除)。ユーザーと、そのユーザーの投稿・コメント・リアクションに
 * 同じ deletedAt を立てる。復帰時は同じ deletedAt のものだけ戻す。
 * 途中で失敗しても、同じ処理を再実行すれば揃う (設定済みの deletedAt を使い回す)。
 *
 * @param user 退会させるユーザー (mongoose document)
 */
export async function softDeleteUser(user: UserDoc): Promise<void> {
  const at: Date = user.deletedAt ?? new Date();
  if (!user.deletedAt) {
    user.deletedAt = at;
    // email の unique を解放し、同じメールでの再登録を別レコードにする
    user.deletedEmail = user.email;
    user.email = `deleted+${user.id}@deleted.invalid`;
    await user.save();
  }

  // 他人の投稿に付けたコメント/リアクション分の非正規化カウンタを戻す
  const [comments, reactions] = await Promise.all([
    Comment.find({ author: user._id }).select('post').lean(),
    Reaction.find({ user: user._id }).select('post').lean(),
  ]);
  await Promise.all([
    Post.updateMany({ author: user._id }, { deletedAt: at }),
    Comment.updateMany({ author: user._id }, { deletedAt: at }),
    Reaction.updateMany({ user: user._id }, { deletedAt: at }),
  ]);
  const ops = [
    ...counterOps(comments, 'commentCount', -1),
    ...counterOps(reactions, 'reactionCount', -1),
  ];
  if (ops.length > 0) await Post.bulkWrite(ops);
}

/**
 * 退会の取り消し。退会時に論理削除したデータも戻す。
 * 呼び出し側で「退会済みであること」「元のメールが他で使われていないこと」を確認済みの前提。
 *
 * @param user 復帰させるユーザー (mongoose document)
 */
export async function restoreUser(user: UserDoc): Promise<void> {
  const at: Date = user.deletedAt;
  if (user.deletedEmail) {
    user.email = user.deletedEmail;
    user.deletedEmail = undefined;
  }
  user.deletedAt = null;
  await user.save();

  const mine = { deletedAt: at };
  const opt = { withDeleted: true };
  const [comments, reactions] = await Promise.all([
    Comment.find({ author: user._id, ...mine }).setOptions(opt).select('post').lean(),
    Reaction.find({ user: user._id, ...mine }).setOptions(opt).select('post').lean(),
  ]);
  await Promise.all([
    Post.updateMany({ author: user._id, ...mine }, { deletedAt: null }).setOptions(opt),
    Comment.updateMany({ author: user._id, ...mine }, { deletedAt: null }).setOptions(opt),
    Reaction.updateMany({ user: user._id, ...mine }, { deletedAt: null }).setOptions(opt),
  ]);
  const ops = [
    ...counterOps(comments, 'commentCount', 1),
    ...counterOps(reactions, 'reactionCount', 1),
  ];
  if (ops.length > 0) await Post.bulkWrite(ops);
}
