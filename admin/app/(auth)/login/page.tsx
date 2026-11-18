"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authenticate } from "../actions";

export default function LoginPage() {
  const [error, dispatch, isPending] = useActionState(authenticate, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">管理画面</h1>
          <p className="text-sm text-slate-600 mt-1">Member Hub 運営管理システム</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-8">
          <form action={dispatch} className="space-y-5">
            <div className="leading-normal space-y-1.5">
              <label htmlFor="email" className="block text-sm font-bold text-slate-900">
                メールアドレス
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@example.com"
                className="h-12"
              />
            </div>

            <div className="leading-normal space-y-1.5">
              <label htmlFor="password" className="block text-sm font-bold text-slate-900">
                パスワード
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
