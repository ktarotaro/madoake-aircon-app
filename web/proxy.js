import { NextResponse } from "next/server";
import { verifySessionToken } from "./lib/session";

export const config = {
  // manifest・アイコンは、iPhoneのホーム画面追加時にCookieなしで取得されることがあるため認証対象外
  // （中身はアイコン画像とアプリ名のみで機密情報なし）。
  // api/heating-plan は Vercel Schedules から呼ばれるため、パスワードの代わりに CRON_SECRET で守る（route.js 内で確認）。
  matcher: ["/((?!login|api/login|api/heating-plan|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-192.png|icon-512.png|apple-touch-icon.png).*)"],
};

export async function proxy(request) {
  const token = request.cookies.get("session")?.value;
  const password = process.env.APP_PASSWORD;
  const valid = password ? await verifySessionToken(token, password) : false;

  if (!valid) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}
