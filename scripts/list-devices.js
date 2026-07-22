import { randomUUID } from "node:crypto";
import { createHmac } from "node:crypto";

const token = process.env.SWITCHBOT_TOKEN;
const secret = process.env.SWITCHBOT_SECRET;

if (!token || !secret) {
  console.error("SWITCHBOT_TOKEN / SWITCHBOT_SECRET が環境変数に設定されていません。");
  console.error(".env ファイルを用意して `node --env-file=.env scripts/list-devices.js` で実行してください。");
  process.exit(1);
}

function buildAuthHeaders() {
  const t = Date.now().toString();
  const nonce = randomUUID();
  const data = token + t + nonce;
  const sign = createHmac("sha256", secret).update(data, "utf8").digest("base64");

  return {
    Authorization: token,
    sign,
    t,
    nonce,
    "Content-Type": "application/json; charset=utf8",
  };
}

const res = await fetch("https://api.switch-bot.com/v1.1/devices", {
  method: "GET",
  headers: buildAuthHeaders(),
});

const body = await res.json();

if (body.statusCode !== 100) {
  console.error("APIエラー:", JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log("=== 登録デバイス一覧 ===");
for (const d of body.body.deviceList) {
  console.log(`- ${d.deviceName}（種類: ${d.deviceType}） -> deviceId: ${d.deviceId}`);
}

if (body.body.infraredRemoteList?.length) {
  console.log("\n=== 赤外線リモコン一覧 ===");
  for (const d of body.body.infraredRemoteList) {
    console.log(`- ${d.deviceName}（種類: ${d.remoteType}） -> deviceId: ${d.deviceId}`);
  }
}
