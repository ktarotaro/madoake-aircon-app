// 翌日の暖房の段取り（蓄熱暖房の蓄熱量とエアコンの使い方）を、翌日の予報から決める（2026-11-11追加）。
// 判定ルールはここ1か所だけに置く。Macアプリはこの結果（data/heating-plan.json）を読んで通知するだけ。
// 根拠はVaultの projects/home-energy/home-energy.md「予報別の運用」。
// この機能は通知だけで、エアコン・蓄熱暖房を自動で操作しない。

// 日本時間の「明日」の日付（YYYY-MM-DD）
export function tomorrowDateJst(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  jst.setUTCDate(jst.getUTCDate() + 1);
  return jst.toISOString().slice(0, 10);
}

// 気象庁の予報JSON（forecast/016000.json）から、指定日の最低・最高気温を取り出す。
// 府県天気予報の気温は、その日の 00:00 の枠が最低気温、09:00 の枠が最高気温。
// 取れなければ null（JSONの形式は気象庁の公開説明がないため、想定と違う形も「取れない」扱いにする）。
export function extractTemps(forecastJson, targetDate, pointCode) {
  const report = Array.isArray(forecastJson) ? forecastJson[0] : null;
  const seriesList = report?.timeSeries;
  if (!Array.isArray(seriesList)) return null;

  for (const series of seriesList) {
    const area = series.areas?.find((a) => a.area?.code === pointCode && Array.isArray(a.temps));
    if (!area || !Array.isArray(series.timeDefines)) continue;

    let min = null;
    let max = null;
    series.timeDefines.forEach((time, i) => {
      if (typeof time !== "string" || !time.startsWith(targetDate)) return;
      const value = area.temps[i] === "" || area.temps[i] == null ? null : Number(area.temps[i]);
      if (value === null || Number.isNaN(value)) return;
      if (time.startsWith(`${targetDate}T00:00`)) min = value;
      if (time.startsWith(`${targetDate}T09:00`)) max = value;
    });

    if (min === null || max === null) return null;
    return { min, max, reportDatetime: report.reportDatetime ?? null };
  }
  return null;
}

// 冬の日か（明日の最低気温がしきい値以下）。冬の日だけ通知し、アプリに段取りを表示する（2026-11-11 本人決定：3℃以下）
export function isWinterDay({ min }, thresholds) {
  return min <= thresholds.notifyMin;
}

// 画面に出す日付「11/12（木）」。targetDate は YYYY-MM-DD（日本時間の日付）
export function dateLabelJa(targetDate) {
  const [y, m, d] = targetDate.split("-").map(Number);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}（${weekday}）`;
}

// 判定は上から順に当てはめ、最初に当たったものを使う
export function decideHeatingPlan({ max, min }, thresholds) {
  if (max < thresholds.veryColdMax) {
    return { storage: "強め", morning: null, daytime: "蓄熱に任せる", evening: "22時以降にエアコン" };
  }
  if (min <= thresholds.coldMin) {
    return { storage: "中くらい", morning: null, daytime: "寒いときだけエアコンで補助", evening: "22時以降にエアコン" };
  }
  if (max < thresholds.mildMax) {
    return { storage: "弱め", morning: "7:00", daytime: "在宅時に運転", evening: "夕方〜就寝に運転" };
  }
  return { storage: "切る〜最小", morning: "7:00", daytime: "在宅時に運転", evening: "夕方〜就寝に運転" };
}

// 「最高12℃・最低0℃」。アプリの表示は日をまたいでも読めるよう「明日」を付けない
export function tempSummary(temps) {
  return `最高${temps.max}℃・最低${temps.min}℃`;
}

// 通知文（ロック画面で読める長さ）
export function buildHeatingMessage(temps, plan) {
  const title = `明日 ${tempSummary(temps)}`;
  const storage = `蓄熱は「${plan.storage}」（22時までに設定）。`;
  const aircon = plan.morning
    ? `エアコンは朝${plan.morning}タイマー、${plan.evening}。`
    : `朝のエアコンはなし、日中は${plan.daytime}、${plan.evening}。`;
  return { title, body: storage + aircon };
}

export const FORECAST_UNAVAILABLE_MESSAGE = {
  title: "明日の予報を取れませんでした",
  body: "天気予報を見て、22時までに蓄熱量を決めてください。",
};
