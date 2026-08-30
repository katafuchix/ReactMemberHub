import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from './config/db';
import { Announcement } from './models/Announcement';
import { Comment } from './models/Comment';
import { Content } from './models/Content';
import { Event } from './models/Event';
import { Post } from './models/Post';
import { Reaction } from './models/Reaction';
import { User } from './models/User';

async function seed() {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Reaction.deleteMany({}),
    Announcement.deleteMany({}),
    Event.deleteMany({}),
    Content.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('password123', 10);

  const [admin, member, premium] = await User.create([
    {
      email: 'admin@example.com',
      passwordHash,
      displayName: '運営スタッフ',
      role: 'admin',
      membership: 'premium',
      bio: 'Member Hub の運営です。',
      emailVerified: true,
    },
    {
      email: 'member@example.com',
      passwordHash,
      displayName: 'たろう',
      bio: 'よろしくお願いします！',
      emailVerified: true,
    },
    {
      email: 'premium@example.com',
      passwordHash,
      displayName: 'はなこ',
      membership: 'premium',
      bio: '有料会員です。',
      emailVerified: true,
    },
  ]);

  const now = Date.now();
  const day = 86400000;

  await Announcement.create([
    {
      title: 'Member Hub をオープンしました',
      body: 'コミュニティへようこそ。まずはプロフィールを設定して、自己紹介を投稿してみましょう。',
      pinned: true,
    },
    {
      title: '9月のメンテナンス予定',
      body: '9/15 02:00-04:00 にメンテナンスを実施します。',
    },
  ]);

  await Event.create([
    {
      title: 'オンライン交流会 #1',
      body: 'Zoom で気軽に話しましょう。初参加大歓迎です。',
      location: 'オンライン (Zoom)',
      startAt: new Date(now + 3 * day),
      endAt: new Date(now + 3 * day + 2 * 3600000),
    },
    {
      title: '勉強会: コミュニティ運営のコツ',
      body: '過去の運営事例を共有します。',
      location: '東京・渋谷',
      startAt: new Date(now + 10 * day),
      endAt: new Date(now + 10 * day + 3 * 3600000),
    },
    {
      title: '（終了）キックオフ',
      body: '立ち上げミーティングでした。',
      location: 'オンライン',
      startAt: new Date(now - 7 * day),
      endAt: new Date(now - 7 * day + 3600000),
    },
  ]);

  await Content.create([
    {
      title: 'ようこそ動画（サンプル）',
      description: '誰でも視聴できる紹介動画です。',
      type: 'video',
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      visibility: 'public',
      isRecommended: true,
    },
    {
      title: '会員向けポッドキャスト 第1回',
      description: 'ログインすると聴けます。',
      type: 'audio',
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
      visibility: 'members',
      isRecommended: true,
    },
    {
      title: '有料会員限定レポート',
      description: '有料会員だけが閲覧できる記事です。',
      type: 'article',
      url: 'https://example.com/premium-report',
      visibility: 'premium',
    },
    {
      title: 'コミュニティ活用ガイド',
      description: '使い方の記事。',
      type: 'article',
      url: 'https://example.com/guide',
      visibility: 'public',
    },
  ]);

  const [p1, p2] = await Post.create([
    {
      author: member._id,
      body: 'はじめまして、たろうです。ランニングと読書が趣味です。',
      tags: ['自己紹介', 'ランニング'],
      visibility: 'members',
    },
    {
      author: premium._id,
      body: '週末のオンライン交流会、参加します！',
      tags: ['イベント'],
      visibility: 'public',
    },
  ]);

  const c1 = await Comment.create({
    post: p1._id,
    author: admin._id,
    body: 'ようこそ！プロフィールも埋めてみてくださいね。',
  });
  await Post.findByIdAndUpdate(p1._id, { $inc: { commentCount: 1 } });

  await Reaction.create([
    { post: p1._id, user: admin._id, type: 'like' },
    { post: p1._id, user: premium._id, type: 'celebrate' },
    { post: p2._id, user: member._id, type: 'support' },
  ]);
  await Post.findByIdAndUpdate(p1._id, { $inc: { reactionCount: 2 } });
  await Post.findByIdAndUpdate(p2._id, { $inc: { reactionCount: 1 } });

  console.log('seed done:', {
    users: ['admin@example.com', 'member@example.com', 'premium@example.com'],
    password: 'password123',
    posts: [String(p1._id), String(p2._id)],
    comment: String(c1._id),
  });

  await disconnectDB();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
