import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, type Post, type User } from '../lib/api';

/** 他のメンバー (および自分) が閲覧できる公開プロフィールページ */
export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { user: me } = useAuth();
  const isMe = me?.id === id;

  const userQuery = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const { data } = await api.get<{ user: User }>(`/users/${id}`);
      return data.user;
    },
    enabled: Boolean(id),
    retry: false,
  });

  const postsQuery = useQuery({
    queryKey: ['user-posts', id, Boolean(me)],
    queryFn: async () => {
      const { data } = await api.get<{ items: Post[]; total: number }>(
        `/users/${id}/posts`,
      );
      return data;
    },
    enabled: Boolean(id),
  });

  if (userQuery.isLoading) return <p>読み込み中...</p>;
  if (userQuery.isError || !userQuery.data)
    return <p className="text-red-600">ユーザーが見つかりません</p>;

  const profile = userQuery.data;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-white p-4">
        <div className="flex items-start gap-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-20 w-20 rounded-full border object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600">
              {profile.displayName.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold">{profile.displayName}</h1>
              {profile.membership === 'premium' && (
                <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-700">
                  有料会員
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              登録日: {new Date(profile.createdAt).toLocaleDateString('ja-JP')}
            </p>
            {isMe && (
              <Link
                to="/profile"
                className="mt-2 inline-block rounded border px-3 py-1 text-sm hover:bg-slate-100"
              >
                プロフィールを編集
              </Link>
            )}
          </div>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
          {profile.bio || '自己紹介はまだありません'}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">投稿{postsQuery.data ? `（${postsQuery.data.total}）` : ''}</h2>
        {postsQuery.isLoading && <p>読み込み中...</p>}
        {postsQuery.isError && (
          <p className="text-red-600">投稿を読み込めませんでした</p>
        )}
        {postsQuery.data?.items.length === 0 && (
          <p className="text-sm text-slate-500">投稿はまだありません</p>
        )}
        {postsQuery.data?.items.map((post) => (
          <Link
            key={post._id}
            to={`/posts/${post._id}`}
            className="block rounded-lg border bg-white p-4 hover:border-indigo-300"
          >
            <div className="mb-1 flex items-center gap-2 text-sm text-slate-500">
              <span>{new Date(post.createdAt).toLocaleString('ja-JP')}</span>
              {post.visibility === 'members' && (
                <span className="rounded bg-slate-100 px-1 text-xs">
                  会員限定
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-slate-800">{post.body}</p>
            <div className="mt-2 text-xs text-slate-400">
              💬 {post.commentCount} ・ 👍 {post.reactionCount}
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
