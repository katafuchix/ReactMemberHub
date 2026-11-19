"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminUser } from "@/lib/api";
import { updateUser, type FormState } from "./actions";

const selectClass =
  "h-10 w-full rounded border bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

export function UserEditForm({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateUser.bind(null, user.id),
    {},
  );

  return (
    <form action={action}>
      <fieldset disabled={Boolean(user.deletedAt)} className="space-y-4">
      <Field label="メールアドレス" htmlFor="email">
        <Input id="email" value={user.email} disabled readOnly />
      </Field>
      <Field label="表示名" htmlFor="displayName">
        <Input
          id="displayName"
          name="displayName"
          defaultValue={user.displayName}
          maxLength={60}
          required
        />
      </Field>
      <Field label="アバターURL" htmlFor="avatarUrl">
        <Input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          defaultValue={user.avatarUrl}
          placeholder="https://..."
        />
      </Field>
      <Field label="自己紹介" htmlFor="bio">
        <textarea
          id="bio"
          name="bio"
          defaultValue={user.bio ?? ""}
          maxLength={500}
          rows={4}
          className="w-full rounded border bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="会員種別" htmlFor="membership">
          <select
            id="membership"
            name="membership"
            defaultValue={user.membership}
            className={selectClass}
          >
            <option value="free">無料会員</option>
            <option value="premium">有料会員</option>
          </select>
        </Field>
        <Field label="権限" htmlFor="role">
          {isSelf ? (
            <>
              <input type="hidden" name="role" value={user.role} />
              <select id="role" disabled defaultValue={user.role} className={selectClass}>
                <option value="admin">管理者</option>
              </select>
            </>
          ) : (
            <select id="role" name="role" defaultValue={user.role} className={selectClass}>
              <option value="member">一般会員</option>
              <option value="admin">管理者</option>
            </select>
          )}
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="emailVerified"
          defaultChecked={user.emailVerified}
          className="h-4 w-4 accent-indigo-600"
        />
        メール認証済み
      </label>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存"}
        </Button>
        {state.ok && !pending && (
          <p role="status" className="text-sm text-emerald-700">
            保存しました
          </p>
        )}
        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
      </div>
      </fieldset>
    </form>
  );
}
