import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { signToken } from '../lib/jwt';
import { validateBody } from '../lib/validate';
import { requireAuth } from '../middleware/auth';
import { User, publicUser } from '../models/User';
import {
  generateVerificationCode,
  isDevLike,
  sendVerificationEmail,
} from '../services/emailService';

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

const verifyEmailSchema = z.object({
  token: z.string().regex(/^\d{6}$/),
});

const resendSchema = z.object({
  email: z.string().email(),
});

function newVerificationToken() {
  const value = generateVerificationCode();
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_TTL_MIN * 60_000);
  return { value, expiresAt };
}

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
  const token = newVerificationToken();
  const user = await User.create({
    email,
    passwordHash,
    displayName,
    emailVerified: false,
    emailVerificationToken: token,
  });

  try {
    await sendVerificationEmail({
      email: user.email,
      displayName: user.displayName,
      code: token.value,
    });
  } catch (err) {
    console.error('[auth] verification email send failed', err);
    await user.deleteOne();
    res.status(502).json({ error: 'email_send_failed' });
    return;
  }

  // 認証が済むまでトークンは発行しない (自動ログインしない)
  res.status(201).json({
    needsVerification: true,
    email: user.email,
    ...(isDevLike() ? { devCode: token.value } : {}),
  });
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
  if (!user.emailVerified) {
    res.status(403).json({ error: 'email_unverified' });
    return;
  }

  const token = signToken(String(user._id));
  res.json({ token, user: publicUser(user) });
});

// POST /api/auth/verify-email — 6桁コードでメールアドレスを確認
router.post('/verify-email', validateBody(verifyEmailSchema), async (req, res) => {
  const { token } = req.body as z.infer<typeof verifyEmailSchema>;

  const user = await User.findOne({ 'emailVerificationToken.value': token });
  if (!user) {
    res.status(400).json({ error: 'invalid_token' });
    return;
  }
  if (user.emailVerified) {
    user.emailVerificationToken = undefined;
    await user.save();
    res.json({ ok: true, alreadyVerified: true });
    return;
  }
  const expiresAt = user.emailVerificationToken?.expiresAt;
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: 'token_expired' });
    return;
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();
  res.json({ ok: true });
});

// POST /api/auth/resend-verification — 確認コードを再送
router.post('/resend-verification', validateBody(resendSchema), async (req, res) => {
  const { email } = req.body as z.infer<typeof resendSchema>;

  const user = await User.findOne({ email: email.toLowerCase() });
  // ユーザーの存在有無は伏せる。未認証ユーザーのときだけ再送する。
  if (!user || user.emailVerified) {
    res.json({ ok: true });
    return;
  }

  const token = newVerificationToken();
  user.emailVerificationToken = token;
  await user.save();

  try {
    await sendVerificationEmail({
      email: user.email,
      displayName: user.displayName,
      code: token.value,
    });
  } catch (err) {
    console.error('[auth] verification email resend failed', err);
    res.status(502).json({ error: 'email_send_failed' });
    return;
  }

  res.json({ ok: true, ...(isDevLike() ? { devCode: token.value } : {}) });
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
