import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tomorrowDateJst,
  extractTemps,
  decideHeatingPlan,
  buildHeatingMessage,
} from "../web/lib/heatingPlan.js";
import { config } from "../web/lib/config.js";

const t = config.heatingThresholds;
const decide = (max, min) => decideHeatingPlan({ max, min }, t).storage;

test("最高 -1℃ → 真冬日で「強め」", () => {
  assert.equal(decide(-1, -3), "強め");
});

test("最高 0℃ ちょうど → 真冬日ではない（最低 -4℃ なら「弱め」）", () => {
  assert.equal(decide(0, -4), "弱め");
});

test("最高 -1℃・最低 -10℃ → 上の行が優先されて「強め」", () => {
  assert.equal(decide(-1, -10), "強め");
});

test("最低 -5℃ ちょうど → 「中くらい」", () => {
  assert.equal(decide(2, -5), "中くらい");
});

test("最低 -4℃ → 「中くらい」ではない（最高 2℃ なら「弱め」）", () => {
  assert.equal(decide(2, -4), "弱め");
});

test("最低 -6℃ なら最高が 5℃以上でも「中くらい」（上から順に当てはめる）", () => {
  assert.equal(decide(8, -6), "中くらい");
});

test("最高 4℃ → 「弱め」", () => {
  assert.equal(decide(4, 0), "弱め");
});

test("最高 5℃ ちょうど → 「切る〜最小」", () => {
  assert.equal(decide(5, 0), "切る〜最小");
});

test("通知文：最高5℃・最低0℃", () => {
  const temps = { max: 5, min: 0 };
  const message = buildHeatingMessage(temps, decideHeatingPlan(temps, t));
  assert.equal(message.title, "明日 最高5℃・最低0℃");
  assert.equal(message.body, "蓄熱は「切る〜最小」（22時までに設定）。エアコンは朝7:00タイマー、夕方〜就寝に運転。");
});

test("通知文：朝のエアコンなしの日", () => {
  const temps = { max: -2, min: -8 };
  const message = buildHeatingMessage(temps, decideHeatingPlan(temps, t));
  assert.equal(message.body, "蓄熱は「強め」（22時までに設定）。朝のエアコンはなし、日中は蓄熱に任せる、22時以降にエアコン。");
});

test("日本時間21時（UTC 12時）の明日", () => {
  assert.equal(tomorrowDateJst(new Date("2026-11-11T12:00:00Z")), "2026-11-12");
});

test("日本時間の日付が変わる直前（UTC 14:59）でも明日は翌日", () => {
  assert.equal(tomorrowDateJst(new Date("2026-11-11T14:59:00Z")), "2026-11-12");
});

// 2026-11-11 11時発表の実データ（札幌の気温部分のみ抜粋）
const forecast11 = [
  {
    reportDatetime: "2026-11-11T11:00:00+09:00",
    timeSeries: [
      { timeDefines: ["2026-11-11T11:00:00+09:00"], areas: [{ area: { name: "石狩地方", code: "016010" }, weatherCodes: ["101"] }] },
      {
        timeDefines: [
          "2026-11-11T09:00:00+09:00",
          "2026-11-11T00:00:00+09:00",
          "2026-11-12T00:00:00+09:00",
          "2026-11-12T09:00:00+09:00",
        ],
        areas: [
          { area: { name: "札幌", code: "14163" }, temps: ["5", "5", "1", "11"] },
          { area: { name: "岩見沢", code: "15356" }, temps: ["5", "5", "0", "10"] },
        ],
      },
    ],
  },
];

test("予報JSONから札幌の明日の最低・最高を取り出す", () => {
  assert.deepEqual(extractTemps(forecast11, "2026-11-12", "14163"), {
    min: 1,
    max: 11,
    reportDatetime: "2026-11-11T11:00:00+09:00",
  });
});

test("明日の枠が無い → null", () => {
  assert.equal(extractTemps(forecast11, "2026-11-13", "14163"), null);
});

test("値が空文字 → null", () => {
  const broken = structuredClone(forecast11);
  broken[0].timeSeries[1].areas[0].temps[3] = "";
  assert.equal(extractTemps(broken, "2026-11-12", "14163"), null);
});

test("想定と違う形のJSON → null", () => {
  assert.equal(extractTemps({}, "2026-11-12", "14163"), null);
  assert.equal(extractTemps(null, "2026-11-12", "14163"), null);
});
