import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import VerifyCodeForm from '../components/VerifyCodeForm';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 登録後: メール認証フェーズ
  const [pending, setPending] = useState<{ email: string; devCode?: string } | null>(
    null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await register(email, password, displayName);
      setPending({ email: res.email, devCode: res.devCode });
    } catch (err: any) {
      const code = err?.response?.data?.error;
      setError(
        code === 'email_taken'
          ? 'このメールアドレスは登録済みです'
          : code === 'email_send_failed'
            ? '確認メールの送信に失敗しました。時間を置いて再度お試しください'
            : 'パスワードは8文字以上、メール形式を確認してください',
      );
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <div className="mx-auto mt-16 max-w-sm rounded-lg border bg-white p-6">
        <h1 className="mb-4 text-lg font-bold">メールアドレスの確認</h1>
        <VerifyCodeForm
          email={pending.email}
          devCode={pending.devCode}
          onVerified={async () => {
            await login(email, password);
            navigate('/', { replace: true });
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border bg-white p-6">
      <h1 className="mb-4 text-lg font-bold">新規登録</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="表示名"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          placeholder="パスワード (8文字以上)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? '…' : '登録する'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        既にアカウントがある場合は{' '}
        <Link to="/login" className="text-indigo-600 hover:underline">
          ログイン
        </Link>
      </p>
    </div>
  );
}
