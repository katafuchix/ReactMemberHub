"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiFetch } from "@/lib/api";

export interface FormState {
  ok?: boolean;
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  validation_error: "入力内容を確認してください（アバターURLは https:// から始まるURL）",
  cannot_demote_self: "自分自身の管理者権限は外せません",
  cannot_delete_self: "自分自身は退会できません",
  not_found: "ユーザーが見つかりません",
  user_deleted: "退会済みのユーザーは編集できません。復帰してから編集してください",
  email_taken: "同じメールアドレスで再登録されているため復帰できません",
};

function errorMessage(e: unknown) {
  if (e instanceof ApiError) return ERROR_MESSAGES[e.code] ?? "処理に失敗しました";
  return "APIサーバーに接続できません";
}

export async function updateUser(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const body = {
    displayName: String(formData.get("displayName") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    avatarUrl: String(formData.get("avatarUrl") ?? ""),
    membership: String(formData.get("membership") ?? ""),
    role: String(formData.get("role") ?? ""),
    emailVerified: formData.get("emailVerified") === "on",
  };
  try {
    await apiFetch(`/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return { ok: true };
}

/** 退会 (論理削除)。データは残り、ログインと公開表示だけ止まる */
export async function deleteUser(id: string): Promise<FormState> {
  try {
    await apiFetch(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return { ok: true };
}

/** 退会の取り消し */
export async function restoreUser(id: string): Promise<FormState> {
  try {
    await apiFetch(`/admin/users/${encodeURIComponent(id)}/restore`, { method: "POST" });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return { ok: true };
}
