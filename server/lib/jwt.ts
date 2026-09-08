import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;
}

/**
 * ユーザー ID から JWT を発行する。
 *
 * @param userId 対象ユーザーの ID
 * @returns 署名済み JWT 文字列
 */
export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * JWT を検証してペイロードを取り出す。
 *
 * @param token 検証対象の JWT
 * @returns デコードされたペイロード
 * @throws トークンが不正・期限切れの場合 (jsonwebtoken がスロー)
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
