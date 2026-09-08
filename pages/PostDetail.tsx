import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, type Comment, type Post } from '../lib/api';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  const postQuery = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const { data } = await api.get<{ post: Post }>(`/posts/${id}`);
      return data.post;
    },
  });

  const commentsQuery = useQuery({
    queryKey: ['post', id, 'comments'],
    queryFn: async () => {
      const { data } = await api.get<{ items: Comment[] }>(
        `/posts/${id}/comments`,
      );
      return data.items;
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      await api.post(`/posts/${id}/comments`, { body: comment });
    },
    onSuccess: () => {
      setComment('');
      void queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  const react = useMutation({
    mutationFn: async (type: 'like' | 'celebrate' | 'support') => {
      await api.post(`/posts/${id}/reactions`, { type });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', id] }),
  });

  const removePost = useMutation({
    mutationFn: async () => {
      await api.delete(`/posts/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate('/');
    },
  });

  if (postQuery.isLoading) return <p className="text-slate-500">読み込み中…</p>;
  if (postQuery.isError || !postQuery.data)
    return <p className="text-red-600">投稿を表示できません（会員限定の可能性）</p>;

  const post = postQuery.data;
  const canDelete =
    user && (user.id === post.author?._id || user.role === 'admin');

  return (
    <div className="space-y-4">
      <article className="rounded-lg border bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
          <span className="font-medium text-slate-700">
            {post.author?.displayName ?? '退会ユーザー'}
          </span>
          <span>{new Date(post.createdAt).toLocaleString('ja-JP')}</span>
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
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-slate-500">👍 {post.reactionCount}</span>
          {user && (
            <>
              <button
                type="button"
                onClick={() => react.mutate('like')}
                className="rounded border px-2 py-1 text-xs hover:bg-slate-100"
              >
                👍 いいね
              </button>
              <button
                type="button"
                onClick={() => react.mutate('celebrate')}
                className="rounded border px-2 py-1 text-xs hover:bg-slate-100"
              >
                🎉 祝う
              </button>
              <button
                type="button"
                onClick={() => react.mutate('support')}
                className="rounded border px-2 py-1 text-xs hover:bg-slate-100"
              >
                💪 応援
              </button>
            </>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => removePost.mutate()}
              className="ml-auto rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              削除
            </button>
          )}
        </div>
      </article>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">コメント</h2>
        {user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (comment.trim()) addComment.mutate();
            }}
            className="mb-4 flex gap-2"
          >
            <input
              className="flex-1 rounded border px-3 py-2 text-sm"
              placeholder="コメントを書く"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              type="submit"
              disabled={addComment.isPending || !comment.trim()}
              className="rounded bg-indigo-600 px-4 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              送信
            </button>
          </form>
        ) : (
          <p className="mb-4 text-sm text-slate-500">
            コメントするにはログインしてください
          </p>
        )}
        <ul className="space-y-3">
          {commentsQuery.isError && (
            <li className="text-sm text-red-600">
              コメントを読み込めませんでした
            </li>
          )}
          {commentsQuery.data?.map((c) => (
            <li key={c._id} className="border-b pb-2 last:border-0">
              <div className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">
                  {c.author?.displayName ?? '退会ユーザー'}
                </span>{' '}
                · {new Date(c.createdAt).toLocaleString('ja-JP')}
              </div>
              <p className="text-slate-800">{c.body}</p>
            </li>
          ))}
          {commentsQuery.data?.length === 0 && (
            <li className="text-sm text-slate-500">まだコメントはありません</li>
          )}
        </ul>
      </section>
    </div>
  );
}
