import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { validateBody } from '../lib/validate';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { REACTION_TYPES, Reaction } from '../models/Reaction';

const router = Router();

const createPostSchema = z.object({
  body: z.string().min(1).max(2000),
  imageUrls: z.array(z.string().url()).max(4).optional(),
  tags: z.array(z.string().min(1).max(24)).max(6).optional(),
  visibility: z.enum(['public', 'members']).optional(),
});

const createCommentSchema = z.object({
  body: z.string().min(1).max(1000),
});

const reactionSchema = z.object({
  type: z.enum(REACTION_TYPES).default('like'),
});

/** 未ログインなら public のみ、ログイン済みなら members も見える */
function visibilityFilter(req: { user?: unknown }) {
  return req.user ? {} : { visibility: 'public' };
}

// GET /api/posts?tag=&q=&page=1&limit=20
router.get('/', optionalAuth, async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
  const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;

  const filter: Record<string, unknown> = { ...visibilityFilter(req) };
  if (tag) filter.tags = tag;
  if (q) filter.body = { $regex: q, $options: 'i' }; // PoC 用の簡易検索

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

// POST /api/posts
router.post('/', requireAuth, validateBody(createPostSchema), async (req, res) => {
  const data = req.body as z.infer<typeof createPostSchema>;
  const post = await Post.create({ ...data, author: req.user!.id });
  const populated = await post.populate(
    'author',
    'displayName avatarUrl membership',
  );
  res.status(201).json({ post: populated.toObject() });
});

// GET /api/posts/:id
router.get('/:id', optionalAuth, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const post = await Post.findById(req.params.id)
    .populate('author', 'displayName avatarUrl membership bio')
    .lean();
  if (!post) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (post.visibility === 'members' && !req.user) {
    res.status(401).json({ error: 'members_only' });
    return;
  }
  res.json({ post });
});

// DELETE /api/posts/:id — 投稿者本人か管理者。子コメント/リアクションも削除
router.delete('/:id', requireAuth, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const post = await Post.findById(req.params.id);
  if (!post) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const isOwner = String(post.author) === req.user!.id;
  if (!isOwner && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  await Promise.all([
    Comment.deleteMany({ post: post._id }),
    Reaction.deleteMany({ post: post._id }),
    post.deleteOne(),
  ]);
  res.json({ ok: true });
});

// --- コメント ---

// GET /api/posts/:id/comments
router.get('/:id/comments', optionalAuth, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const comments = await Comment.find({ post: req.params.id })
    .sort({ createdAt: 1 })
    .populate('author', 'displayName avatarUrl membership')
    .lean();
  res.json({ items: comments });
});

// POST /api/posts/:id/comments
router.post(
  '/:id/comments',
  requireAuth,
  validateBody(createCommentSchema),
  async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const { body } = req.body as z.infer<typeof createCommentSchema>;
    const comment = await Comment.create({
      post: post._id,
      author: req.user!.id,
      body,
    });
    post.commentCount += 1;
    await post.save();
    const populated = await comment.populate(
      'author',
      'displayName avatarUrl membership',
    );
    res.status(201).json({ comment: populated.toObject() });
  },
);

// --- リアクション ---

// POST /api/posts/:id/reactions  { type }
router.post(
  '/:id/reactions',
  requireAuth,
  validateBody(reactionSchema),
  async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const { type } = req.body as z.infer<typeof reactionSchema>;
    try {
      await Reaction.create({ post: post._id, user: req.user!.id, type });
      post.reactionCount += 1;
      await post.save();
    } catch (err: any) {
      if (err?.code !== 11000) throw err; // 既に付与済みは無視
    }
    const count = await Reaction.countDocuments({ post: post._id });
    res.json({ ok: true, reactionCount: count });
  },
);

// DELETE /api/posts/:id/reactions  { type }
router.delete(
  '/:id/reactions',
  requireAuth,
  validateBody(reactionSchema),
  async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const { type } = req.body as z.infer<typeof reactionSchema>;
    const deleted = await Reaction.findOneAndDelete({
      post: post._id,
      user: req.user!.id,
      type,
    });
    if (deleted) {
      post.reactionCount = Math.max(0, post.reactionCount - 1);
      await post.save();
    }
    const count = await Reaction.countDocuments({ post: post._id });
    res.json({ ok: true, reactionCount: count });
  },
);

export default router;
