"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/users", label: "ユーザー管理", icon: Users },
];

export function Sidebar({ userName }: { userName: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setMobileOpen(false);

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
        <button
          className="w-10 h-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 cursor-pointer"
          onClick={() => setMobileOpen(true)}
          aria-label="メニューを開く"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        <span className="text-base font-bold text-indigo-600">Member Hub 管理</span>
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col h-screen",
          "fixed lg:sticky top-0 z-50 transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <button
          className="lg:hidden absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 cursor-pointer"
          onClick={close}
          aria-label="メニューを閉じる"
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>

        <div className="px-6 py-5 border-b border-slate-200">
          <p className="text-base font-bold text-indigo-600 truncate">Member Hub</p>
          <p className="text-xs text-slate-500">管理画面</p>
        </div>

        <nav aria-label="メインナビゲーション" className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-indigo-50 text-indigo-600 font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:underline active:bg-slate-100",
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {isActive && <ChevronRight className="w-3 h-3 ml-auto" aria-hidden="true" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-4 border-t border-slate-200 mt-auto">
          <div className="flex items-center gap-3 px-4 py-2 mb-1">
            <div
              className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0"
              role="img"
              aria-label={userName}
            >
              <span className="text-indigo-600 text-sm font-bold">{userName.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
              <p className="text-xs text-slate-500">管理者</p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:underline active:bg-slate-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>ログアウト</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
