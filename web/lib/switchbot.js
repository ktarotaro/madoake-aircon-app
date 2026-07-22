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

export const AC_MODE = { AUTO: 1, COOL: 2, DRY: 3, FAN: 4, HEAT: 5 };
export const AC_FAN_SPEED = { AUTO: 1, LOW: 2, MEDIUM: 3, HIGH: 4 };

// 安全設定（本人の明示的な指示）：暖房・自動モードでは絶対にエアコンを操作しない。
// バックエンド側 src/switchbotClient.js と同じガードをフロントエンド側にも重複して設ける。
const ALLOWED_AC_MODES = new Set([AC_MODE.COOL, AC_MODE.DRY]);

export async function sendAcCommand({
  token,
  secret,
  deviceId,
  temperature,
  mode = AC_MODE.COOL,
  fanSpeed = AC_FAN_SPEED.AUTO,
  power = "on",
}) {
  if (power === "on" && !ALLOWED_AC_MODES.has(mode)) {
    throw new Error("安全設定により、このモードでのエアコン操作は許可されていません。");
  }

  const parameter = `${Math.round(temperature)},${mode},${fanSpeed},${power}`;

  const res = await fetch(`${API_BASE}/devices/${deviceId}/commands`, {
    method: "POST",
    headers: buildAuthHeaders(token, secret),
    body: JSON.stringify({ command: "setAll", parameter, commandType: "command" }),
  });
  const body = await res.json();

  if (body.statusCode !== 100) {
    throw new Error(`SwitchBot APIエラー: ${JSON.stringify(body)}`);
  }

  return body;
}
