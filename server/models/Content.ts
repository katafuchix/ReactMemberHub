import { Schema, model } from 'mongoose';

const contentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    // video: 動画URL / audio: 音声URL / article: 記事URL
    type: {
      type: String,
      enum: ['video', 'audio', 'article'],
      required: true,
    },
    url: { type: String, required: true },
    thumbnailUrl: { type: String, default: '' },
    // public: 誰でも / members: ログイン / premium: 有料会員のみ (会員限定コンテンツ)
    visibility: {
      type: String,
      enum: ['public', 'members', 'premium'],
      default: 'public',
      index: true,
    },
    // おすすめコンテンツ枠に出すか
    isRecommended: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const Content = model('Content', contentSchema);
