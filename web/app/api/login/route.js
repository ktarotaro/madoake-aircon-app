import { NextResponse } from "next/server";
import { createSessionToken } from "../../../lib/session";
import { checkRateLimit, recordFailedAttempt, clearAttempts } from "../../../lib/rateLimit";

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request) {
  const ip = getClientIp(request);

  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `試行回数が多すぎます。${Math.ceil(rateLimit.retryAfterSeconds / 60)}分後に再試行してください` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const { password } = await request.json();
  const correctPassword = process.env.APP_PASSWORD;

  if (!correctPassword || password !== correctPassword) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }

  clearAttempts(ip);

  const token = await createSessionToken(correctPassword);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
