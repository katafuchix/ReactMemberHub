import {
  ArrowUpRight,
  Crown,
  MailWarning,
  MessageSquare,
  Newspaper,
  UserPlus,
  Users,
} from "lucide-react";
import { apiFetch, type AdminStats } from "@/lib/api";
import { requireAdminSession } from "@/lib/session";
import { formatDate, formatNumber } from "@/lib/utils";

export default async function DashboardPage() {
  const [user, stats] = await Promise.all([
    requireAdminSession(),
    apiFetch<AdminStats>("/admin/stats"),
  ]);

  const kpiCards = [
    {
      label: "会員数",
      value: formatNumber(stats.users.total),
      change: `直近7日 +${formatNumber(stats.users.new7d)}人`,
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "有料会員",
      value: formatNumber(stats.users.premium),
      change: `会員の ${
        stats.users.total ? Math.round((stats.users.premium / stats.users.total) * 100) : 0
      }%`,
      icon: Crown,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "投稿数",
      value: formatNumber(stats.posts.total),
      change: `直近7日 +${formatNumber(stats.posts.new7d)}件`,
      icon: Newspaper,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "コメント数",
      value: formatNumber(stats.comments.total),
      change: "累計",
      icon: MessageSquare,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-1">こんにちは、{user.displayName}さん</p>
      </div>

      {/* KPI カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 leading-tight">{kpi.label}</p>
              <div
                className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center flex-shrink-0`}
              >
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} aria-hidden="true" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {kpi.value}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight
                className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-emerald-600">{kpi.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 最近の登録ユーザー + 要対応 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">最近の登録ユーザー</h2>
            <span className="text-xs text-slate-500">新しい順 5件</span>
          </div>
          <ul>
            {stats.recentUsers.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0"
              >
                <div
                  className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  <span className="text-indigo-600 text-sm font-bold">
                    {u.displayName.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{u.displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">
                  {formatDate(u.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">要対応</h2>
          <ul className="space-y-3">
            <li className="flex flex-col gap-0.5 py-2 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  <MailWarning className="w-3 h-3" aria-hidden="true" />
                  メール未認証
                </span>
                <span className="text-xs text-slate-500">現在</span>
              </div>
              <p className="text-sm text-slate-800 font-medium">
                {formatNumber(stats.users.unverified)}人
              </p>
              <p className="text-xs text-slate-500">ログインできない状態のユーザー</p>
            </li>
            <li className="flex flex-col gap-0.5 py-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  <UserPlus className="w-3 h-3" aria-hidden="true" />
                  新規登録
                </span>
                <span className="text-xs text-slate-500">直近7日</span>
              </div>
              <p className="text-sm text-slate-800 font-medium">
                {formatNumber(stats.users.new7d)}人
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
