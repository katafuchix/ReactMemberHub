import { NextResponse, type NextRequest } from "next/server";

// Cookie が無ければログイン画面へ。トークンの有効性・管理者権限は
// 各ページ側 (requireAdminSession) と Express (requireAdmin) で検証する。
export function proxy(req: NextRequest) {
  const hasToken = req.cookies.has("memberhub_admin_token");
  const isLogin = req.nextUrl.pathname === "/login";
  if (!hasToken && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
