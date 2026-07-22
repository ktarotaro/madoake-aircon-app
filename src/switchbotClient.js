import { randomUUID, createHmac } from "node:crypto";

const API_BASE = "https://api.switch-bot.com/v1.1";

function buildAuthHeaders(token, secret) {
  const t = Date.now().toString();
  const nonce = randomUUID();
  const sign = createHmac("sha256", secret).update(token + t + nonce, "utf8").digest("base64");

  return {
    Authorization: token,
    sign,
    t,
    nonce,
    "Content-Type": "application/json; charset=utf8",
  };
}

// 温湿度計（Meter）の現在値を取得する。戻り値: { temperature: number, humidity: number }
export async function getMeterStatus({ token, secret, deviceId }) {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/status`, {
    method: "GET",
    headers: buildAuthHeaders(token, secret),
  });
  const body = await res.json();

  if (body.statusCode !== 100) {
    throw new Error(`SwitchBot APIエラー: ${JSON.stringify(body)}`);
  }

  return {
    temperature: body.body.temperature,
    humidity: body.body.humidity,
  };
}
