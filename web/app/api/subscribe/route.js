import { NextResponse } from "next/server";
import { getJsonFile, putJsonFile } from "../../../lib/github";
import { config } from "../../../lib/config";

export async function POST(request) {
  const githubToken = process.env.GITHUB_WRITE_TOKEN;
  if (!githubToken) {
    return NextResponse.json({ error: "サーバー側の環境変数が未設定です" }, { status: 500 });
  }

  const { subscription, unsubscribe } = await request.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const repoArgs = {
    token: githubToken,
    owner: config.githubOwner,
    repo: config.githubRepo,
    branch: config.githubBranch,
  };

  const { data, sha } = await getJsonFile({ ...repoArgs, path: config.pushSubscriptionsPath });
  const existing = data ?? [];

  const withoutThis = existing.filter((s) => s.endpoint !== subscription.endpoint);
  const updated = unsubscribe ? withoutThis : [...withoutThis, subscription];

  await putJsonFile({
    ...repoArgs,
    path: config.pushSubscriptionsPath,
    data: updated,
    message: unsubscribe ? "Remove push subscription" : "Add push subscription",
    sha,
  });

  return NextResponse.json({ ok: true });
}
