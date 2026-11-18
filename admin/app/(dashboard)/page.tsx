import { apiFetch, type AdminStats } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";

function Tile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{formatNumber(value)}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const stats = await apiFetch<AdminStats>("/admin/stats");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-1">会員・投稿の概況</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="会員数" value={stats.users.total} sub={`直近7日で +${stats.users.new7d}`} />
        <Tile label="有料会員" value={stats.users.premium} />
        <Tile label="メール未認証" value={stats.users.unverified} />
        <Tile label="投稿数" value={stats.posts.total} sub={`直近7日で +${stats.posts.new7d}`} />
        <Tile label="コメント数" value={stats.comments.total} />
      </div>

      <section className="mt-8 bg-white rounded-xl border border-slate-200">
        <h2 className="px-5 py-4 text-base font-bold text-slate-900 border-b border-slate-200">
          最近の登録ユーザー
        </h2>
        <ul className="divide-y divide-slate-100">
          {stats.recentUsers.map((u) => (
            <li key={u.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{u.displayName}</p>
                <p className="text-slate-500 truncate">{u.email}</p>
              </div>
              <span className="text-slate-500 flex-shrink-0 ml-4">{formatDate(u.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
