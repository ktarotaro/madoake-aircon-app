import { NextResponse } from "next/server";
import { verifySessionToken } from "./lib/session";

export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
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
