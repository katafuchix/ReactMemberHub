import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, type AdminUser, type Paged } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";

const LIMIT = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; membership?: string; page?: string }>;
}) {
  const { q = "", membership = "", page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);

  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (q) params.set("q", q);
  if (membership) params.set("membership", membership);
  const data = await apiFetch<Paged<AdminUser>>(`/admin/users?${params}`);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (membership) sp.set("membership", membership);
    sp.set("page", String(p));
    return `/users?${sp}`;
  };
  const start = data.total === 0 ? 0 : (data.page - 1) * LIMIT + 1;
  const end = Math.min(data.page * LIMIT, data.total);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">ユーザー管理</h1>
        <p className="text-sm text-slate-500 mt-1">登録ユーザーの一覧・検索</p>
      </div>

      <form method="get" className="flex flex-col gap-3 sm:flex-row mb-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            aria-hidden="true"
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder="表示名・メールで検索"
            aria-label="検索"
            className="pl-9"
          />
        </div>
        <select
          name="membership"
          defaultValue={membership}
          aria-label="会員種別"
          className="h-10 rounded-lg border border-slate-500 bg-white px-3 text-base text-slate-900 hover:border-black"
        >
          <option value="">すべての会員種別</option>
          <option value="free">無料会員</option>
          <option value="premium">有料会員</option>
        </select>
        <Button type="submit">検索</Button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="py-3 px-4 font-bold">表示名</th>
              <th className="py-3 px-4 font-bold">メール</th>
              <th className="py-3 px-4 font-bold">会員種別</th>
              <th className="py-3 px-4 font-bold hidden sm:table-cell">認証</th>
              <th className="py-3 px-4 font-bold hidden md:table-cell">登録日</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0">
                <td className="py-3 px-4 font-bold text-slate-900">
                  {u.displayName}
                  {u.role === "admin" && (
                    <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-500">
                      管理者
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-700">{u.email}</td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.membership === "premium"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.membership === "premium" ? "有料会員" : "無料会員"}
                  </span>
                </td>
                <td className="py-3 px-4 hidden sm:table-cell text-slate-700">
                  {u.emailVerified ? "済" : "未認証"}
                </td>
                <td className="py-3 px-4 hidden md:table-cell text-slate-700">
                  {formatDate(u.createdAt)}
                </td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-500">
                  該当するユーザーがいません
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
