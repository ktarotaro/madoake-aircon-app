// テスト用: CO2を高い値（1500 ppm）でシミュレートし、通知機能を確認するスクリプト

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { getCo2MeterStatus } from "../src/switchbotClient.js";
import { getAmedasStatus } from "../src/weatherClient.js";
import { decide } from "../src/logic.js";
import { evaluateAcFeedback, evaluateOvercooling } from "../src/acFeedback.js";
import { sendPushToAll, buildNotificationMessages } from "../src/pushNotifications.js";
import { config } from "../src/config.js";

const token = process.env.SWITCHBOT_TOKEN;
const secret = process.env.SWITCHBOT_SECRET;

if (!token || !secret) {
  console.error("SWITCHBOT_TOKEN / SWITCHBOT_SECRET が設定されていません。");
  process.exit(1);
}

const indoorRaw = await getCo2MeterStatus({ token, secret, deviceId: config.switchbotCo2DeviceId });
// *** テスト用: CO2を1500 ppmに上書き ***
const indoor = { ...indoorRaw, co2: 1500 };
const outdoorRaw = await getAmedasStatus({ stationId: config.amedasStationId });

const outdoor = { temperature: outdoorRaw.temperature, humidity: outdoorRaw.humidity };

const result = decide({
  indoor,
  outdoor,
  precipitation10m: outdoorRaw.precipitation10m,
  alpha: config.alpha,
});

let commandRecord = null;
try {
  commandRecord = JSON.parse(await readFile("data/ac-last-command.json", "utf8"));
} catch {
  // 初回実行時はファイルが存在しない。無視してよい。
}

let previous = null;
try {
  previous = JSON.parse(await readFile("data/latest.json", "utf8"));
} catch {
  // 初回実行時はファイルが存在しない。無視してよい。
}

const acFeedback = evaluateAcFeedback({ commandRecord, currentIndoorTemperature: indoor.temperature });
const overcoolingWarning = evaluateOvercooling({ commandRecord, currentIndoorTemperature: indoor.temperature });

const output = {
  updatedAt: new Date().toISOString(),
  indoor,
  outdoor: { ...outdoor, observedAt: outdoorRaw.observedAt },
  ...result,
  acFeedback,
  overcoolingWarning,
};

await mkdir("data", { recursive: true });
await writeFile("data/latest.json", JSON.stringify(output, null, 2) + "\n");

console.log(JSON.stringify(output, null, 2));

const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const messages = buildNotificationMessages(previous, output);

if (messages.length > 0 && vapidPrivateKey) {
  let subscriptions = [];
  try {
    subscriptions = JSON.parse(await readFile("data/push-subscriptions.json", "utf8"));
  } catch {
    // 誰も購読していない場合はファイルが存在しない。無視してよい。
  }

  if (subscriptions.length > 0) {
    const deadEndpointSet = new Set();
    for (const message of messages) {
      const { deadEndpoints } = await sendPushToAll({
        subscriptions,
        vapidPrivateKey,
        title: message.title,
        body: message.body,
      });
      deadEndpoints.forEach((endpoint) => deadEndpointSet.add(endpoint));
    }

    if (deadEndpointSet.size > 0) {
      const alive = subscriptions.filter((s) => !deadEndpointSet.has(s.endpoint));
      await writeFile("data/push-subscriptions.json", JSON.stringify(alive, null, 2) + "\n");
      console.log(`失効した購読先を${deadEndpointSet.size}件削除しました。`);
    }

    console.log(`プッシュ通知を送信しました: ${messages.map((m) => m.title).join(", ")}`);
  }
} else if (messages.length > 0 && !vapidPrivateKey) {
  console.log("VAPID_PRIVATE_KEYが未設定のため、プッシュ通知はスキップしました。");
}

console.log("\n=== テスト実行完了 ===");
console.log(`生成されたco2Note: ${output.co2Note ?? "なし"}`);
console.log(`通知が発火: ${messages.some((m) => m.title.includes("換気")) ? "はい" : "いいえ"}`);
