"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteUser, restoreUser } from "./actions";

export function DeleteUserButton({
  id,
  displayName,
  postCount,
  commentCount,
  deleted,
}: {
  id: string;
  displayName: string;
  postCount: number;
  commentCount: number;
  deleted: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const res = await (deleted ? restoreUser(id) : deleteUser(id));
      if (res.error) setError(res.error);
      else setConfirming(false);
    });

  if (deleted) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-700">
          退会済みです。復帰させると、ログイン・プロフィール表示に加えて、退会時に非表示にした投稿・コメント・リアクションも元に戻ります。
        </p>
        <Button onClick={run} disabled={pending}>
          {pending ? "処理中…" : "退会を取り消す（復帰）"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        このユーザーを退会させる
      </Button>
    );
  }

  return (
    <div role="alertdialog" aria-label="退会の確認" className="space-y-3">
      <p className="text-sm text-slate-700">
        <strong>{displayName}</strong> を退会させます。ログインできなくなり、プロフィール・投稿 {postCount} 件・コメント{" "}
        {commentCount} 件・リアクションも非表示（論理削除）になります。データは残り、あとから復帰できます。
        同じメールアドレスで再登録した場合は別のユーザーとして作成されます。
      </p>
      <div className="flex items-center gap-2">
        <Button variant="destructive" onClick={run} disabled={pending}>
          {pending ? "処理中…" : "退会を実行"}
        </Button>
        <Button variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
          キャンセル
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
