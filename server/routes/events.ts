import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { validateBody } from '../lib/validate';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { Event } from '../models/Event';

const router = Router();

const upsertSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  imageUrl: z.string().url().or(z.literal('')).optional(),
  location: z.string().max(200).optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  status: z.enum(['draft', 'published']).optional(),
});

// GET /api/events?scope=upcoming|all
router.get('/', async (req, res) => {
  const filter: Record<string, unknown> = { status: 'published' };
  if (req.query.scope !== 'all') {
    filter.endAt = { $gte: new Date() };
  }
  const items = await Event.find(filter).sort({ startAt: 1 }).lean();
  res.json({ items });
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const item = await Event.findById(req.params.id).lean();
  if (!item || item.status !== 'published') {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ item });
});

// POST /api/events — 管理者のみ
router.post(
  '/',
  requireAuth,
  requireAdmin,
  validateBody(upsertSchema),
  async (req, res) => {
    const item = await Event.create(req.body);
    res.status(201).json({ item: item.toObject() });
  },
);

// DELETE /api/events/:id — 管理者のみ
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  await Event.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
