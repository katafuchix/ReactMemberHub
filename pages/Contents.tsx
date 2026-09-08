import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, type ContentItem } from '../lib/api';

function ContentCard({ item }: { item: ContentItem }) {
  const { user } = useAuth();

  return (
    <article className="rounded-lg border bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="rounded bg-slate-100 px-1.5 text-xs uppercase text-slate-600">
          {item.type}
        </span>
        {item.visibility !== 'public' && (
          <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-700">
            {item.visibility === 'premium' ? '有料会員限定' : '会員限定'}
          </span>
        )}
        {item.isRecommended && (
          <span className="rounded bg-indigo-100 px-1.5 text-xs text-indigo-700">
            おすすめ
          </span>
        )}
      </div>
      <h3 className="mt-1 font-semibold">{item.title}</h3>
      {item.description && (
        <p className="mt-1 text-sm text-slate-600">{item.description}</p>
      )}

      {item.locked ? (
        <div className="mt-3 rounded border border-dashed bg-slate-50 p-3 text-sm text-slate-500">
          {!user ? (
            <>
              このコンテンツは会員限定です。{' '}
              <Link to="/login" className="text-indigo-600 hover:underline">
                ログイン
              </Link>
            </>
          ) : (
            <>
              有料会員限定です。プロフィールから{' '}
              <Link to="/profile" className="text-indigo-600 hover:underline">
                アップグレード
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="mt-3">
          {item.type === 'video' && item.url && (
            <video src={item.url} controls className="w-full rounded" />
          )}
          {item.type === 'audio' && item.url && (
            <audio src={item.url} controls className="w-full" />
          )}
          {item.type === 'article' && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:underline"
            >
              記事を開く →
            </a>
          )}
        </div>
      )}
    </article>
  );
}

export default function Contents() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['contents'],
    queryFn: async () => {
      const { data } = await api.get<{ items: ContentItem[] }>('/contents');
      return data.items;
    },
  });

  if (isLoading) return <p className="text-slate-500">読み込み中…</p>;
  if (isError)
    return <p className="text-red-600">コンテンツを読み込めませんでした</p>;

  const recommended = data?.filter((c) => c.isRecommended) ?? [];
  const rest = data?.filter((c) => !c.isRecommended) ?? [];

  return (
    <div className="space-y-6">
      {recommended.length > 0 && (
        <section className="space-y-3">
          <h1 className="text-lg font-bold">おすすめコンテンツ</h1>
          {recommended.map((c) => (
            <ContentCard key={c.id} item={c} />
          ))}
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">すべてのコンテンツ</h2>
        {rest.map((c) => (
          <ContentCard key={c.id} item={c} />
        ))}
        {data?.length === 0 && (
          <p className="text-slate-500">コンテンツはありません</p>
        )}
      </section>
    </div>
  );
}
