import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, type AdminUser, type Paged } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";

const LIMIT = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; membership?: string; status?: string; page?: string }>;
}) {
  const { q = "", membership = "", status = "", page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);

  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (q) params.set("q", q);
  if (membership) params.set("membership", membership);
  if (status) params.set("status", status);
  const data = await apiFetch<Paged<AdminUser>>(`/admin/users?${params}`);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (membership) sp.set("membership", membership);
    if (status) sp.set("status", status);
    sp.set("page", String(p));
    return `/users?${sp}`;
  };
  const filterHref = (m: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (m) sp.set("membership", m);
    if (status) sp.set("status", status);
    const qs = sp.toString();
    return qs ? `/users?${qs}` : "/users";
  };
  const start = data.total === 0 ? 0 : (data.page - 1) * LIMIT + 1;
  const end = Math.min(data.page * LIMIT, data.total);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">ユーザー管理</h1>
        <p className="text-sm text-slate-500 mt-1">登録ユーザーの一覧・検索（表示名から詳細・編集・退会へ）</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <form method="get" className="leading-normal w-full sm:w-80">
          {membership && <input type="hidden" name="membership" value={membership} />}
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="名前・メールで検索"
              aria-label="検索"
              className="w-full pl-9 pr-3 py-2 text-base border rounded border bg-white text-slate-900"
            />
          </div>
        </form>

        <div className="flex flex-wrap gap-1">
          {[
            { value: "", label: "すべて" },
            { value: "free", label: "無料会員" },
            { value: "premium", label: "有料会員" },
          ].map((opt) => (
            <Link
              key={opt.value}
              href={filterHref(opt.value)}
              aria-current={membership === opt.value ? "true" : undefined}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border transition-colors ${
                membership === opt.value
                  ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-medium"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4" aria-label="状態">
        {[
          { value: "", label: "有効なユーザー" },
          { value: "deleted", label: "退会済み" },
          { value: "all", label: "すべて" },
        ].map((opt) => {
          const sp = new URLSearchParams();
          if (q) sp.set("q", q);
          if (membership) sp.set("membership", membership);
          if (opt.value) sp.set("status", opt.value);
          const qs = sp.toString();
          return (
            <Link
              key={opt.value}
              href={qs ? `/users?${qs}` : "/users"}
              aria-current={status === opt.value ? "true" : undefined}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm border transition-colors ${
                status === opt.value
                  ? "bg-slate-800 border-slate-800 text-white font-medium"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {[
                { label: "表示名", hide: "" },
                { label: "メール", hide: "" },
                { label: "会員種別", hide: "" },
                { label: "メール認証", hide: "hidden sm:table-cell" },
                { label: "登録日", hide: "hidden md:table-cell" },
              ].map((col) => (
                <th
                  key={col.label}
                  scope="col"
                  className={`${col.hide} text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((u) => (
              <tr
                key={u.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <td className="py-2.5 px-3 text-sm font-medium text-slate-900 whitespace-nowrap">
                  <Link
                    href={`/users/${u.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {u.displayName}
                  </Link>
                  {u.deletedAt && (
                    <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      退会済み
                    </span>
                  )}
                  {u.role === "admin" && (
                    <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                      管理者
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-sm text-slate-700 whitespace-nowrap max-w-[220px] truncate">
                  {u.email}
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.membership === "premium"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        u.membership === "premium" ? "bg-amber-500" : "bg-slate-400"
                      }`}
                    />
                    {u.membership === "premium" ? "有料会員" : "無料会員"}
                  </span>
                </td>
                <td className="hidden sm:table-cell py-2.5 px-3 text-sm text-slate-700 whitespace-nowrap">
                  {u.emailVerified ? "済" : "未認証"}
                </td>
                <td className="hidden md:table-cell py-2.5 px-3 text-sm text-slate-700 whitespace-nowrap">
                  {formatDate(u.createdAt)}
                </td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-sm text-slate-500">
                  該当するユーザーが見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <p>
          {formatNumber(data.total)} 件中 {formatNumber(start)}–{formatNumber(end)} 件
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1)}>前へ</Link>
            </Button>
          )}
          {data.hasMore && (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1)}>次へ</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
