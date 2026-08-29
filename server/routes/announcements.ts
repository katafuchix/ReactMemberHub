import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { validateBody } from '../lib/validate';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { Announcement } from '../models/Announcement';

const router = Router();

const upsertSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  imageUrl: z.string().url().or(z.literal('')).optional(),
  pinned: z.boolean().optional(),
  status: z.enum(['draft', 'published']).optional(),
});

// GET /api/announcements — 公開中のみ
router.get('/', async (_req, res) => {
  const items = await Announcement.find({ status: 'published' })
    .sort({ pinned: -1, publishedAt: -1 })
    .lean();
  res.json({ items });
});

// GET /api/announcements/:id
router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const item = await Announcement.findById(req.params.id).lean();
  if (!item || item.status !== 'published') {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ item });
});

// POST /api/announcements — 管理者のみ
router.post(
  '/',
  requireAuth,
  requireAdmin,
  validateBody(upsertSchema),
  async (req, res) => {
    const item = await Announcement.create(req.body);
    res.status(201).json({ item: item.toObject() });
  },
);

// DELETE /api/announcements/:id — 管理者のみ
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  await Announcement.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
