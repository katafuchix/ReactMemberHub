import { Schema, model } from 'mongoose';

const postSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    imageUrls: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    // public: 誰でも / members: ログインユーザーのみ
    visibility: {
      type: String,
      enum: ['public', 'members'],
      default: 'members',
      index: true,
    },
    // 非正規化カウンタ (コメント/リアクション追加時に $inc で更新)
    commentCount: { type: Number, default: 0 },
    reactionCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

postSchema.index({ createdAt: -1 });
postSchema.index({ tags: 1, createdAt: -1 });

export const Post = model('Post', postSchema);
