import "server-only";
import { cookies } from "next/headers";

export const TOKEN_COOKIE = "memberhub_admin_token";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000/api";

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  role: "member" | "admin";
  membership: "free" | "premium";
  emailVerified: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export interface AdminStats {
  users: { total: number; premium: number; unverified: number; new7d: number };
  posts: { total: number; new7d: number };
  comments: { total: number };
  recentUsers: AdminUser[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(`API ${status}: ${code}`);
  }
}

/** ログイン前の呼び出し用 (Cookie のトークンを付けない) */
export async function apiPublic<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.error ?? "unknown");
  return body as T;
}

/** 管理者トークン付きで Express API を呼ぶ (サーバーコンポーネント / Server Action 専用) */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  return apiPublic<T>(path, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
}
