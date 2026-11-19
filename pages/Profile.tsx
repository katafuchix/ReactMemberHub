import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import axios from 'axios';

export default function Profile() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [password, setPassword] = useState('');
  const [withdrawError, setWithdrawError] = useState('');

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

  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setWithdrawError('');
    try {
      await api.post('/users/me/withdraw', { password });
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      const code = axios.isAxiosError(err) ? err.response?.data?.error : undefined;
      setWithdrawError(
        code === 'invalid_password'
          ? 'パスワードが正しくありません'
          : code === 'admin_cannot_withdraw'
            ? '管理者アカウントはここから退会できません'
            : '退会に失敗しました。時間をおいて再度お試しください',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">プロフィール</h1>
          <Link
            to={`/users/${user.id}`}
            className="text-sm text-indigo-600 hover:underline"
          >
            公開プロフィールを見る
          </Link>
        </div>
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

      {user.role !== 'admin' && (
        <section className="rounded-lg border border-red-200 bg-white p-4">
          <h2 className="mb-2 font-semibold text-red-700">退会</h2>
          {!withdrawing ? (
            <>
              <p className="mb-3 text-sm text-slate-600">
                退会するとログインできなくなり、プロフィール・投稿・コメントは表示されなくなります。
              </p>
              <button
                type="button"
                onClick={() => setWithdrawing(true)}
                className="rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                退会する
              </button>
            </>
          ) : (
            <form onSubmit={withdraw} className="space-y-3">
              <p className="text-sm text-slate-600">
                本当に退会しますか？ 確認のためパスワードを入力してください。
              </p>
              <input
                type="password"
                autoComplete="current-password"
                required
                placeholder="パスワード"
                className="w-full rounded border px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {withdrawError && (
                <p role="alert" className="text-sm text-red-600">
                  {withdrawError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                >
                  退会を実行
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setWithdrawing(false);
                    setPassword('');
                    setWithdrawError('');
                  }}
                  className="rounded border px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
