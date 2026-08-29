import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

/** req.body を zod スキーマで検証し、パース結果で置き換えるミドルウェア */
export const validateBody =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'validation_error',
        details: result.error.flatten(),
      });
      return;
    }
    req.body = result.data;
    next();
  };
