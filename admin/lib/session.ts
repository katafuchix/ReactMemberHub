import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { ApiError, apiFetch, type AdminUser } from "@/lib/api";

/**
 * 現在のログインユーザーを返す。未ログイン・非管理者なら /login へ。
 * 権限の最終判定は Express の requireAdmin が行う (ここは画面側の導線用)。
 */
export const requireAdminSession = cache(async (): Promise<AdminUser> => {
  try {
    const { user } = await apiFetch<{ user: AdminUser }>("/auth/me");
    if (user.role !== "admin") redirect("/login?error=forbidden");
    return user;
  } catch (e) {
    if (e instanceof ApiError) redirect("/login");
    throw e;
  }
});
