import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { User } from '../models/User';

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
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl ?? '',
    role: u.role,
    membership: u.membership,
    emailVerified: Boolean(u.emailVerified),
    createdAt: u.createdAt,
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
    User.countDocuments(),
    User.countDocuments({ membership: 'premium' }),
    User.countDocuments({ emailVerified: false }),
    User.countDocuments({ createdAt: { $gte: since } }),
    Post.countDocuments(),
    Post.countDocuments({ createdAt: { $gte: since } }),
    Comment.countDocuments(),
    User.find().sort({ createdAt: -1 }).limit(5).lean(),
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

  const filter: Record<string, unknown> = {};
  if (membership) filter.membership = membership;
  if (q) {
    const re = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ displayName: re }, { email: re }];
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

export default router;
