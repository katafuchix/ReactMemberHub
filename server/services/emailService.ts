import { Resend } from 'resend';
import { env } from '../config/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

if (!resend) {
  console.warn(
    '[email] RESEND_API_KEY 未設定。確認コードはメール送信せずコンソールに出力します。',
  );
}

/** 開発向け挙動 (レスポンスに確認コードを含めてよいか) */
export function isDevLike(): boolean {
  return env.NODE_ENV !== 'production';
}

/** 6桁の数字コードを生成 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface VerificationEmailParams {
  email: string;
  displayName: string;
  code: string;
}

/**
 * メールアドレス確認コードを送信する。
 * RESEND_API_KEY 未設定時はコンソール出力にフォールバックする (PoC 用)。
 *
 * @param params.email 送信先メールアドレス
 * @param params.displayName メール本文に表示する宛名
 * @param params.code 6桁の確認コード
 * @throws Resend の送信に失敗した場合
 */
export async function sendVerificationEmail({
  email,
  displayName,
  code,
}: VerificationEmailParams): Promise<void> {
  if (!resend) {
    console.log('[email] verification code for %s: %s', email, code);
    return;
  }

  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: email,
    subject: '[Member Hub] メールアドレス確認のお願い',
    html: `
      <div style="font-family: sans-serif; color: #1e293b; line-height: 1.6;">
        <p>${displayName} 様</p>
        <p>Member Hub へのご登録ありがとうございます。</p>
        <p>以下の6桁の確認コードを画面に入力して、メールアドレスの確認を完了してください。</p>
        <p style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; padding: 16px 32px; background-color: #eef2ff; color: #4338ca; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; border: 2px solid #c7d2fe;">${code}</span>
        </p>
        <p>・コードの有効期限は ${env.EMAIL_VERIFICATION_TTL_MIN} 分です。</p>
        <p>・確認が完了するとログインできるようになります。</p>
        <p>心当たりがない場合は、このメールを破棄してください。</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend email send failed: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error('Resend email send failed: missing message id');
  }
}
