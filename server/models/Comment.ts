import { Schema, model } from 'mongoose';

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

export const Comment = model('Comment', commentSchema);
