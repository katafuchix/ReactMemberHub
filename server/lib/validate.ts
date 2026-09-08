import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

/**
 * req.body を zod スキーマで検証し、パース結果で置き換えるミドルウェア。
 * 検証に失敗した場合は 400 を返し、next() は呼ばれない。
 *
 * @param schema 検証に使う zod スキーマ
 * @returns Express ミドルウェア
 */
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
