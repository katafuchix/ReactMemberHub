import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type EventItem } from '../lib/api';

export default function Events() {
  const [scope, setScope] = useState<'upcoming' | 'all'>('upcoming');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', scope],
    queryFn: async () => {
      const { data } = await api.get<{ items: EventItem[] }>('/events', {
        params: { scope },
      });
      return data.items;
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">イベント</h1>
        <div className="flex gap-1 text-sm">
          <button
            type="button"
            onClick={() => setScope('upcoming')}
            className={`rounded px-2 py-1 ${
              scope === 'upcoming' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'
            }`}
          >
            開催予定
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`rounded px-2 py-1 ${
              scope === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'
            }`}
          >
            すべて
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-500">読み込み中…</p>
      ) : isError ? (
        <p className="text-red-600">イベントを読み込めませんでした</p>
      ) : (
        data?.map((ev) => (
          <article key={ev._id} className="rounded-lg border bg-white p-4">
            <h2 className="font-semibold">{ev.title}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {new Date(ev.startAt).toLocaleString('ja-JP')} 〜{' '}
              {new Date(ev.endAt).toLocaleString('ja-JP')}
              {ev.location && ` ・ ${ev.location}`}
            </p>
            {ev.imageUrl && (
              <img
                src={ev.imageUrl}
                alt=""
                className="mt-2 max-h-48 rounded object-cover"
              />
            )}
            <p className="mt-2 whitespace-pre-wrap text-slate-800">{ev.body}</p>
          </article>
        ))
      )}
      {data?.length === 0 && (
        <p className="text-slate-500">イベントはありません</p>
      )}
    </div>
  );
}
