import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt';
import { User } from '../models/User';

function extractToken(req: Request): string | null {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function loadUser(token: string) {
  const payload = verifyToken(token);
  const user = await User.findById(payload.sub).lean();
  if (!user) return null;
  return {
    id: String(user._id),
    role: user.role as 'member' | 'admin',
    membership: user.membership as 'free' | 'premium',
  };
}

/** 認証必須。未ログインなら 401 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const user = await loadUser(token);
    if (!user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

/** ログインしていれば req.user をセット。未ログインでも通す */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractToken(req);
    if (token) {
      const user = await loadUser(token);
      if (user) req.user = user;
    }
  } catch {
    /* トークン不正でも匿名として続行 */
  }
  next();
}

/** 管理者のみ。requireAuth の後に使う */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  next();
}
