import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const messages: Record<string, string> = {
  invalid_token: 'コードが正しくありません',
  token_expired: 'コードの有効期限が切れています。再送してください',
  validation_error: '6桁の数字を入力してください',
  email_send_failed: 'メールの再送に失敗しました。時間を置いて試してください',
};

function errText(err: any): string {
  const code = err?.response?.data?.error;
  return messages[code] ?? '認証に失敗しました';
}

interface Props {
  email: string;
  /** 認証成功後の処理 (自動ログインなど) */
  onVerified: () => void | Promise<void>;
  devCode?: string;
}

export default function VerifyCodeForm({ email, onVerified, devCode }: Props) {
  const { verifyEmail, resendVerification } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shownDevCode, setShownDevCode] = useState(devCode);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await verifyEmail(code);
      await onVerified();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { devCode: next } = await resendVerification(email);
      setShownDevCode(next);
      setInfo('確認コードを再送しました');
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-slate-600">
        <span className="font-medium">{email}</span>{' '}
        宛に6桁の確認コードを送信しました。コードを入力してください。
      </p>
      <input
        className="w-full rounded border px-3 py-2 text-center text-lg tracking-[0.5em]"
        inputMode="numeric"
        maxLength={6}
        placeholder="______"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        required
      />
      {shownDevCode && (
        <p className="text-xs text-slate-400">開発用コード: {shownDevCode}</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {info && <p className="text-sm text-green-600">{info}</p>}
      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? '…' : '認証する'}
      </button>
      <button
        type="button"
        onClick={onResend}
        disabled={busy}
        className="w-full rounded border py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
      >
        コードを再送
      </button>
    </form>
  );
}
