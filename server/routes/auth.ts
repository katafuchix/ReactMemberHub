import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { signToken } from '../lib/jwt';
import { validateBody } from '../lib/validate';
import { requireAuth } from '../middleware/auth';
import { User, publicUser } from '../models/User';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(60),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post('/register', validateBody(registerSchema), async (req, res) => {
  const { email, password, displayName } = req.body as z.infer<
    typeof registerSchema
  >;

  const exists = await User.findOne({ email: email.toLowerCase() }).lean();
  if (exists) {
    res.status(409).json({ error: 'email_taken' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, displayName });
  const token = signToken(String(user._id));
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  const token = signToken(String(user._id));
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.id).lean();
  if (!user) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ user: publicUser(user) });
});

export default router;
