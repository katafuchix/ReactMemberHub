import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { validateBody } from '../lib/validate';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Post } from '../models/Post';
import { User, profileUser, publicUser } from '../models/User';

const router = Router();

const updateMeSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().or(z.literal('')).optional(),
});

// PATCH /api/users/me — 自分のプロフィール更新
router.patch('/me', requireAuth, validateBody(updateMeSchema), async (req, res) => {
  const update = req.body as z.infer<typeof updateMeSchema>;
  const user = await User.findByIdAndUpdate(req.user!.id, update, {
    new: true,
  }).lean();
  res.json({ user: publicUser(user) });
});

// POST /api/users/me/upgrade — PoC 用: 有料会員に切り替え (決済はダミー)
router.post('/me/upgrade', requireAuth, async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { membership: 'premium' },
    { new: true },
  ).lean();
  res.json({ user: publicUser(user) });
});

// POST /api/users/me/downgrade — PoC 用: 無料会員に戻す
router.post('/me/downgrade', requireAuth, async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { membership: 'free' },
    { new: true },
  ).lean();
  res.json({ user: publicUser(user) });
});

// GET /api/users/:id — 他ユーザーの公開プロフィール
router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const user = await User.findById(req.params.id).lean();
  if (!user) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ user: profileUser(user) });
});

// GET /api/users/:id/posts?page=1&limit=20 — 指定ユーザーの投稿一覧
// 未ログインは public のみ、ログイン済みは members 限定投稿も含む
router.get('/:id/posts', optionalAuth, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const exists = await User.exists({ _id: req.params.id });
  if (!exists) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
  const filter: Record<string, unknown> = { author: req.params.id };
  if (!req.user) filter.visibility = 'public';

  const [items, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'displayName avatarUrl membership')
      .lean(),
    Post.countDocuments(filter),
  ]);

  res.json({ items, total, page, limit, hasMore: page * limit < total });
});

export default router;
