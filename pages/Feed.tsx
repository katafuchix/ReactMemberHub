import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, type Post } from '../lib/api';

function PostCard({ post }: { post: Post }) {
  return (
    <Link
      to={`/posts/${post._id}`}
      className="block rounded-lg border bg-white p-4 hover:border-indigo-300"
    >
      <div className="mb-1 flex items-center gap-2 text-sm text-slate-500">
        <span className="font-medium text-slate-700">
          {post.author?.displayName ?? '退会ユーザー'}
        </span>
        <span>·</span>
        <span>{new Date(post.createdAt).toLocaleString('ja-JP')}</span>
        {post.visibility === 'members' && (
          <span className="rounded bg-slate-100 px-1 text-xs">会員限定</span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-slate-800">{post.body}</p>
      {post.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {post.tags.map((t) => (
            <span
              key={t}
              className="rounded bg-indigo-50 px-1.5 text-xs text-indigo-600"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 text-xs text-slate-400">
        💬 {post.commentCount} ・ 👍 {post.reactionCount}
      </div>
    </Link>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['posts', search],
    queryFn: async () => {
      const { data } = await api.get<{ items: Post[]; total: number }>(
        '/posts',
        { params: search ? { q: search } : {} },
      );
      return data;
    },
  });

  const createPost = useMutation({
    mutationFn: async () => {
      await api.post('/posts', {
        body,
        tags: tags
          .split(/[,\s]+/)
          .map((t) => t.trim())
          .filter(Boolean),
      });
    },
    onSuccess: () => {
      setBody('');
      setTags('');
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  return (
    <div className="space-y-4">
      {user ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim()) createPost.mutate();
          }}
          className="rounded-lg border bg-white p-4"
        >
          <textarea
            className="w-full rounded border px-3 py-2"
            rows={3}
            placeholder="いまどうしてる？"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-2">
            <input
              className="flex-1 rounded border px-3 py-1.5 text-sm"
              placeholder="タグ (スペース区切り)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <button
              type="submit"
              disabled={createPost.isPending || !body.trim()}
              className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              投稿
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">
          投稿・コメント・リアクションには{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">
            ログイン
          </Link>{' '}
          が必要です。（未ログインでは公開投稿のみ表示）
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
        }}
        className="flex gap-2"
      >
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          placeholder="投稿を検索 (PoC: 部分一致)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="submit"
          className="rounded border px-3 py-2 text-sm hover:bg-slate-100"
        >
          検索
        </button>
      </form>

      {isLoading ? (
        <p className="text-slate-500">読み込み中…</p>
      ) : (
        <div className="space-y-3">
          {data?.items.map((p) => (
            <PostCard key={p._id} post={p} />
          ))}
          {data?.items.length === 0 && (
            <p className="text-slate-500">投稿がありません</p>
          )}
        </div>
      )}
    </div>
  );
}
