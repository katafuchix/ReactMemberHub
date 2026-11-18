"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, apiPublic, TOKEN_COOKIE, type AdminUser } from "@/lib/api";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません",
  email_unverified: "メールアドレスの認証が完了していません",
};

export async function authenticate(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    const { token, user } = await apiPublic<{ token: string; user: AdminUser }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    );
    // 管理者以外にはトークンを保存しない
    if (user.role !== "admin") return "管理者権限がありません";

    (await cookies()).set(TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch (e) {
    if (e instanceof ApiError) {
      return ERROR_MESSAGES[e.code] ?? "ログインに失敗しました";
    }
    return "APIサーバーに接続できません";
  }
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(TOKEN_COOKIE);
  redirect("/login");
}
