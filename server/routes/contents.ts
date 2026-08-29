import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { validateBody } from '../lib/validate';
import { optionalAuth, requireAdmin, requireAuth } from '../middleware/auth';
import { Content } from '../models/Content';

const router = Router();

const upsertSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['video', 'audio', 'article']),
  url: z.string().url(),
  thumbnailUrl: z.string().url().or(z.literal('')).optional(),
  visibility: z.enum(['public', 'members', 'premium']).optional(),
  isRecommended: z.boolean().optional(),
});

/** 閲覧者が visibility を満たすか */
function canView(
  visibility: 'public' | 'members' | 'premium',
  user?: { membership: 'free' | 'premium' },
): boolean {
  if (visibility === 'public') return true;
  if (!user) return false;
  if (visibility === 'members') return true;
  return user.membership === 'premium';
}

// GET /api/contents?type=&recommended=true
// 一覧では鍵付きコンテンツも「ロック状態」で見せる (url は伏せる)
router.get('/', optionalAuth, async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (typeof req.query.type === 'string') filter.type = req.query.type;
  if (req.query.recommended === 'true') filter.isRecommended = true;

  const rows = await Content.find(filter).sort({ createdAt: -1 }).lean();
  const items = rows.map((c: any) => {
    const locked = !canView(c.visibility, req.user);
    return {
      id: String(c._id),
      title: c.title,
      description: c.description,
      type: c.type,
      thumbnailUrl: c.thumbnailUrl,
      visibility: c.visibility,
      isRecommended: c.isRecommended,
      locked,
      url: locked ? null : c.url,
    };
  });
  res.json({ items });
});

// GET /api/contents/:id — 本文 (url) はアクセス権がある場合のみ
router.get('/:id', optionalAuth, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const c = await Content.findById(req.params.id).lean();
  if (!c) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (!canView(c.visibility as any, req.user)) {
    res.status(403).json({
      error: 'locked',
      reason: c.visibility === 'premium' ? 'premium_required' : 'login_required',
    });
    return;
  }
  res.json({ item: c });
});

// POST /api/contents — 管理者のみ
router.post(
  '/',
  requireAuth,
  requireAdmin,
  validateBody(upsertSchema),
  async (req, res) => {
    const item = await Content.create(req.body);
    res.status(201).json({ item: item.toObject() });
  },
);

// DELETE /api/contents/:id — 管理者のみ
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  await Content.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
