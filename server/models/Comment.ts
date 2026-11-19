import { Schema, model } from 'mongoose';
import { softDeletePlugin } from '../lib/softDelete';

const commentSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

commentSchema.index({ post: 1, createdAt: 1 });

// 退会ユーザーのデータは論理削除 (admin の退会処理で一括 deletedAt を立てる)
commentSchema.plugin(softDeletePlugin);

export const Comment = model('Comment', commentSchema);
