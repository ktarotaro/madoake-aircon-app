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

export const AC_MODE = { AUTO: 1, COOL: 2, DRY: 3, FAN: 4, HEAT: 5 };
export const AC_FAN_SPEED = { AUTO: 1, LOW: 2, MEDIUM: 3, HIGH: 4 };

// 赤外線リモコン（エアコン）に setAll コマンドを送信する。
// 呼び出しは必ずユーザーの明示的な確認操作を経てから行うこと（自動cronからは呼ばない）。
export async function sendAcCommand({
  token,
  secret,
  deviceId,
  temperature,
  mode = AC_MODE.COOL,
  fanSpeed = AC_FAN_SPEED.AUTO,
  power = "on",
}) {
  const parameter = `${Math.round(temperature)},${mode},${fanSpeed},${power}`;

  const res = await fetch(`${API_BASE}/devices/${deviceId}/commands`, {
    method: "POST",
    headers: buildAuthHeaders(token, secret),
    body: JSON.stringify({
      command: "setAll",
      parameter,
      commandType: "command",
    }),
  });
  const body = await res.json();

  if (body.statusCode !== 100) {
    throw new Error(`SwitchBot APIエラー（エアコン操作）: ${JSON.stringify(body)}`);
  }

  return body;
}
