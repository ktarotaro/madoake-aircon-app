import { NextResponse } from "next/server";
import { getJsonFile, putJsonFile } from "../../../lib/github";
import { config } from "../../../lib/config";
import { sendPushToAll } from "../../../lib/push";
import {
  tomorrowDateJst,
  extractTemps,
  decideHeatingPlan,
  buildHeatingMessage,
  isWinterDay,
  dateLabelJa,
  tempSummary,
  FORECAST_UNAVAILABLE_MESSAGE,
} from "../../../lib/heatingPlan";

// 翌日の暖房の段取りを、毎日21時（日本時間）にiPhoneへ通知する（2026-11-11追加）。
// Vercel Schedules（web/vercel.json）から21:00と21:20に呼ばれる。21:20の回は、21:00の回が
// 送れていなかったときの予備（同じ日の分を送り済みなら何もしない。Vercelは失敗した回を再実行しないため）。
// 結果は data/heating-plan.json に保存し、Macアプリはそれを読んで通知する（判定ルールはここだけに置く）。
// 通知するのは冬の日（明日の最低気温が config の notifyMin 以下）だけ。冬でない日も結果は保存し、アプリは winter が true のときだけ段取りを表示する。
// 予報を取れなかった日は、前回が冬の日だったときだけ「予報を取れませんでした」を通知する（夏に通知が来ないように）。
// 手動のテスト送信：?test=1 を付けると、送り済みでも時刻に関係なく「【テスト】」付きで送る。
// 認証は CRON_SECRET（Vercelが Authorization: Bearer で送る）。パスワードのログインとは別（web/proxy.js で除外）。

export const dynamic = "force-dynamic";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 今日（日本時間）の22:00をUTCのISO文字列で返す。Macアプリはこの時刻を過ぎたら通知しない
function todayDeadlineIso(now) {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const date = jst.toISOString().slice(0, 10);
  return new Date(`${date}T22:00:00+09:00`).toISOString();
}

async function fetchTomorrowTemps(targetDate) {
  try {
    const res = await fetch(config.jmaForecastUrl, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.error(`気象庁の予報を取得できませんでした: ${res.status}`);
      return null;
    }
    return extractTemps(await res.json(), targetDate, config.jmaTempPointCode);
  } catch (err) {
    console.error(`気象庁の予報を取得できませんでした: ${err.message}`);
    return null;
  }
}

async function handle(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const githubToken = process.env.GITHUB_WRITE_TOKEN;
  if (!vapidPrivateKey || !githubToken) {
    return NextResponse.json({ error: "サーバー側の環境変数が未設定です" }, { status: 500 });
  }

  const isTest = new URL(request.url).searchParams.get("test") === "1";
  const now = new Date();
  const targetDate = tomorrowDateJst(now);

  const repoArgs = {
    token: githubToken,
    owner: config.githubOwner,
    repo: config.githubRepo,
    branch: config.githubBranch,
  };

  const { data: previous, sha } = await getJsonFile({ ...repoArgs, path: config.heatingPlanPath });
  if (!isTest && previous && !previous.test && previous.targetDate === targetDate) {
    return NextResponse.json({ ok: true, skipped: "送信済み", targetDate });
  }

  const temps = await fetchTomorrowTemps(targetDate);
  const plan = temps ? decideHeatingPlan(temps, config.heatingThresholds) : null;
  const message = temps ? buildHeatingMessage(temps, plan) : FORECAST_UNAVAILABLE_MESSAGE;
  const title = isTest ? `【テスト】${message.title}` : message.title;
  const winter = temps ? isWinterDay(temps, config.heatingThresholds) : previous?.winter === true;
  // テストは冬でなくても送る（届くかを確かめるため）
  const notify = isTest || winter;

  let sent = 0;
  let deadEndpoints = [];
  if (notify) {
    const { data: subscriptions } = await getJsonFile({ ...repoArgs, path: config.pushSubscriptionsPath });
    ({ sent, deadEndpoints } = await sendPushToAll({
      subscriptions: subscriptions ?? [],
      vapidPrivateKey,
      title,
      body: message.body,
    }));
  }

  const result = {
    id: `${targetDate}-${now.getTime()}`,
    targetDate,
    createdAt: now.toISOString(),
    // テストはすぐ確かめられるよう1時間、本番は今日の22時（蓄熱の設定期限）まで、Macアプリが通知してよい
    notifyUntil: isTest ? new Date(now.getTime() + 60 * 60 * 1000).toISOString() : todayDeadlineIso(now),
    test: isTest,
    winter,
    notify,
    dateLabel: dateLabelJa(targetDate),
    summary: temps ? tempSummary(temps) : "予報を取れませんでした",
    forecast: temps,
    plan,
    title,
    body: message.body,
    pushSent: sent,
  };

  await putJsonFile({
    ...repoArgs,
    path: config.heatingPlanPath,
    data: result,
    message: `${isTest ? "Test heating plan" : "Heating plan"} for ${targetDate}`,
    sha,
  });

  if (deadEndpoints.length > 0) {
    console.log(`解除済みの購読先が${deadEndpoints.length}件ありました（次の poll.js の送信時に削除されます）`);
  }

  return NextResponse.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
