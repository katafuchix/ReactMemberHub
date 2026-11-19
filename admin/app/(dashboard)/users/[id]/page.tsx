import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ApiError, apiFetch, type AdminUser } from "@/lib/api";
import { requireAdminSession } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import { DeleteUserButton } from "./DeleteUserButton";
import { UserEditForm } from "./UserEditForm";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireAdminSession();

  let data: { user: AdminUser; stats: { postCount: number; commentCount: number } };
  try {
    data = await apiFetch(`/admin/users/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) notFound();
    throw e;
  }
  const { user, stats } = data;
  const isSelf = user.id === me.id;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <Link
        href="/users"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        ユーザー一覧
      </Link>

      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          {user.displayName}
          {user.deletedAt && (
            <span className="ml-3 align-middle rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
              退会済み（{formatDateTime(user.deletedAt)}）
            </span>
          )}
        </h1>
        <p className="text-xs text-slate-500 mt-1 break-all">
          ID: {user.id} ／ 登録日: {formatDateTime(user.createdAt)} ／ 投稿 {stats.postCount} 件
          ／ コメント {stats.commentCount} 件
        </p>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">ユーザー情報</h2>
        <UserEditForm user={user} isSelf={isSelf} />
      </section>

      <section className="bg-white rounded-lg border border-red-200 p-4 sm:p-6">
        <h2 className="text-base font-semibold text-red-700 mb-3">退会</h2>
        {isSelf ? (
          <p className="text-sm text-slate-500">自分自身は退会できません。</p>
        ) : (
          <DeleteUserButton
            id={user.id}
            displayName={user.displayName}
            postCount={stats.postCount}
            commentCount={stats.commentCount}
            deleted={Boolean(user.deletedAt)}
          />
        )}
      </section>
    </div>
  );
}
