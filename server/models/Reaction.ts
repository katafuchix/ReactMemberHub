import { Schema, model } from 'mongoose';

export const REACTION_TYPES = ['like', 'celebrate', 'support'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

const reactionSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: REACTION_TYPES,
      default: 'like',
    },
  },
  { timestamps: true },
);

// 1 ユーザー x 1 投稿 x 1 リアクション種別 は 1 件まで
reactionSchema.index({ post: 1, user: 1, type: 1 }, { unique: true });

export const Reaction = model('Reaction', reactionSchema);
