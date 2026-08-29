import { Schema, model } from 'mongoose';

const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    imageUrl: { type: String, default: '' },
    pinned: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
      index: true,
    },
    publishedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

announcementSchema.index({ status: 1, pinned: -1, publishedAt: -1 });

export const Announcement = model('Announcement', announcementSchema);
