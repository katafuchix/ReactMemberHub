import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'member' | 'admin';
        membership: 'free' | 'premium';
      };
    }
  }
}

export {};
