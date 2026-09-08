import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 500 },
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    // 会員限定コンテンツ用の簡易メンバーシップ
    membership: { type: String, enum: ['free', 'premium'], default: 'free' },
    // メール認証。未認証の間はログイン不可 (server/routes/auth.ts)
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: {
      type: new Schema(
        { value: { type: String }, expiresAt: { type: Date } },
        { _id: false },
      ),
      default: undefined,
    },
  },
  { timestamps: true },
);

export const User = model('User', userSchema);

/**
 * API レスポンス用に公開して良いフィールドだけ返す。
 *
 * @param u User のドキュメント (自分自身の情報表示用。email を含む)
 * @returns レスポンスに含めてよい形に整形したオブジェクト
 */
export function publicUser(u: any) {
  return {
    id: String(u._id),
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl ?? '',
    bio: u.bio ?? '',
    role: u.role,
    membership: u.membership,
    emailVerified: Boolean(u.emailVerified),
    createdAt: u.createdAt,
  };
}

/**
 * 他人のプロフィール表示用 (email を含めない)。
 *
 * @param u User のドキュメント
 * @returns 公開プロフィールとして返してよい形に整形したオブジェクト
 */
export function profileUser(u: any) {
  return {
    id: String(u._id),
    displayName: u.displayName,
    avatarUrl: u.avatarUrl ?? '',
    bio: u.bio ?? '',
    membership: u.membership,
    createdAt: u.createdAt,
  };
}
