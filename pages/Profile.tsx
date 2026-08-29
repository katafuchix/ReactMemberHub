import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export default function Profile() {
  const { user, refresh } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await api.patch('/users/me', { displayName, bio, avatarUrl });
      await refresh();
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  async function toggleMembership() {
    setBusy(true);
    try {
      await api.post(
        user?.membership === 'premium'
          ? '/users/me/downgrade'
          : '/users/me/upgrade',
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-white p-4">
        <h1 className="mb-3 text-lg font-bold">プロフィール</h1>
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600">表示名</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">自己紹介</span>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">アイコン画像 URL</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="https://..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              保存
            </button>
            {saved && <span className="text-sm text-green-600">保存しました</span>}
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-semibold">メンバーシップ（PoC）</h2>
        <p className="mb-3 text-sm text-slate-600">
          現在: <strong>{user.membership === 'premium' ? '有料会員' : '無料会員'}</strong>
          {'　'}— 有料会員は「有料会員限定」コンテンツを閲覧できます。
        </p>
        <button
          type="button"
          onClick={toggleMembership}
          disabled={busy}
          className="rounded border px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
        >
          {user.membership === 'premium'
            ? '無料会員に戻す'
            : '有料会員にアップグレード（ダミー）'}
        </button>
      </section>

      <section className="rounded-lg border bg-white p-4 text-sm text-slate-500">
        <p>メール: {user.email}</p>
        <p>ロール: {user.role}</p>
        <p>登録日: {new Date(user.createdAt).toLocaleDateString('ja-JP')}</p>
      </section>
    </div>
  );
}
