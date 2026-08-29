import { useQuery } from '@tanstack/react-query';
import { api, type Announcement } from '../lib/api';

export default function Announcements() {
  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data } = await api.get<{ items: Announcement[] }>(
        '/announcements',
      );
      return data.items;
    },
  });

  if (isLoading) return <p className="text-slate-500">読み込み中…</p>;

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold">お知らせ</h1>
      {data?.map((a) => (
        <article key={a._id} className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2">
            {a.pinned && (
              <span className="rounded bg-red-100 px-1.5 text-xs text-red-600">
                重要
              </span>
            )}
            <h2 className="font-semibold">{a.title}</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {new Date(a.publishedAt).toLocaleDateString('ja-JP')}
          </p>
          {a.imageUrl && (
            <img
              src={a.imageUrl}
              alt=""
              className="mt-2 max-h-48 rounded object-cover"
            />
          )}
          <p className="mt-2 whitespace-pre-wrap text-slate-800">{a.body}</p>
        </article>
      ))}
      {data?.length === 0 && (
        <p className="text-slate-500">お知らせはありません</p>
      )}
    </div>
  );
}
