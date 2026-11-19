import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { validateBody } from '../lib/validate';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { restoreUser, softDeleteUser } from '../services/userLifecycle';

const router = Router();

// /api/admin/* はすべて管理者のみ
router.use(requireAuth, requireAdmin);

/** 正規表現の特殊文字をエスケープ (検索語をそのまま部分一致させる) */
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 管理画面向けのユーザー整形 (email を含む。passwordHash 等は含めない) */
function adminUser(u: any) {
  return {
    id: String(u._id),
    // 退会済みは退避した元のメールを表示する
    email: u.deletedEmail ?? u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl ?? '',
    bio: u.bio ?? '',
    role: u.role,
    membership: u.membership,
    emailVerified: Boolean(u.emailVerified),
    createdAt: u.createdAt,
    deletedAt: u.deletedAt ?? null,
  };
}

// GET /api/admin/stats — ダッシュボード用の集計
router.get('/stats', async (_req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    userTotal,
    premiumTotal,
    unverifiedTotal,
    newUsers7d,
    postTotal,
    newPosts7d,
    commentTotal,
    recentUsers,
  ] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    User.countDocuments({ deletedAt: null, membership: 'premium' }),
    User.countDocuments({ deletedAt: null, emailVerified: false }),
    User.countDocuments({ deletedAt: null, createdAt: { $gte: since } }),
    Post.countDocuments(),
    Post.countDocuments({ createdAt: { $gte: since } }),
    Comment.countDocuments(),
    User.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  res.json({
    users: {
      total: userTotal,
      premium: premiumTotal,
      unverified: unverifiedTotal,
      new7d: newUsers7d,
    },
    posts: { total: postTotal, new7d: newPosts7d },
    comments: { total: commentTotal },
    recentUsers: recentUsers.map(adminUser),
  });
});

// GET /api/admin/users?q=&membership=&page=1&limit=20
router.get('/users', async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const membership =
    req.query.membership === 'free' || req.query.membership === 'premium'
      ? req.query.membership
      : undefined;

  // status: active(既定) / deleted(退会済み) / all
  const status = req.query.status === 'deleted' || req.query.status === 'all'
    ? req.query.status
    : 'active';

  const filter: Record<string, unknown> = {};
  if (status === 'active') filter.deletedAt = null;
  if (status === 'deleted') filter.deletedAt = { $ne: null };
  if (membership) filter.membership = membership;
  if (q) {
    const re = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ displayName: re }, { email: re }, { deletedEmail: re }];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    items: items.map(adminUser),
    total,
    page,
    limit,
    hasMore: page * limit < total,
  });
});

const updateUserSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().or(z.literal('')).optional(),
  role: z.enum(['member', 'admin']).optional(),
  membership: z.enum(['free', 'premium']).optional(),
  emailVerified: z.boolean().optional(),
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const user = await User.findById(req.params.id).lean();
  if (!user) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const [postCount, commentCount] = await Promise.all([
    Post.countDocuments({ author: user._id }),
    Comment.countDocuments({ author: user._id }),
  ]);
  res.json({ user: adminUser(user), stats: { postCount, commentCount } });
});

// PATCH /api/admin/users/:id — プロフィール・会員種別・権限の更新
router.patch('/users/:id', validateBody(updateUserSchema), async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const update = req.body as z.infer<typeof updateUserSchema>;
  // 自分自身の管理者権限は外せない (管理画面に入れなくなるため)
  if (req.params.id === req.user!.id && update.role === 'member') {
    res.status(400).json({ error: 'cannot_demote_self' });
    return;
  }
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    update,
    { new: true },
  ).lean();
  if (!user) {
    const exists = await User.exists({ _id: req.params.id });
    res.status(exists ? 409 : 404).json({ error: exists ? 'user_deleted' : 'not_found' });
    return;
  }
  res.json({ user: adminUser(user) });
});

// DELETE /api/admin/users/:id — 退会 (論理削除)
// ユーザーと、そのユーザーの投稿・コメント・リアクションに同じ deletedAt を立てる。
// 復帰時は同じ deletedAt のものだけ戻す (退会前に消えていたデータは戻さない)。
router.delete('/users/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  if (req.params.id === req.user!.id) {
    res.status(400).json({ error: 'cannot_delete_self' });
    return;
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  await softDeleteUser(user);
  res.json({ user: adminUser(user) });
});

// POST /api/admin/users/:id/restore — 退会の取り消し (同時に論理削除したデータも戻す)
router.post('/users/:id/restore', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (!user.deletedAt) {
    res.json({ user: adminUser(user) });
    return;
  }

  // 退会後に同じメールで再登録されていたら戻せない
  if (user.deletedEmail && (await User.exists({ email: user.deletedEmail }))) {
    res.status(409).json({ error: 'email_taken' });
    return;
  }
  await restoreUser(user);

  res.json({ user: adminUser(user) });
});

export default router;
