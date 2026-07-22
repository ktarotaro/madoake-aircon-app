// エアコンを操作し、送信したコマンドの記録を data/ac-last-command.json に残す。
//
// 使い方:
//   node scripts/apply-ac.js       … data/latest.json の判定に基づきONにする
//   node scripts/apply-ac.js off   … OFFにする
//
// 【重要】このスクリプトは自動cron（poll.yml）からは呼び出されない。
// 必ず人間が最新の判定内容を目視確認したうえで、手動で実行すること。
// 赤外線リモコンは一方通行の信号のため、エアコンが実際にその通り反応したかは
// API側では確認できない。最終的な確認は必ず目視で行うこと。
import { readFile, writeFile } from "node:fs/promises";
import { sendAcCommand, AC_MODE, AC_FAN_SPEED } from "../src/switchbotClient.js";
import { config } from "../src/config.js";

const token = process.env.SWITCHBOT_TOKEN;
const secret = process.env.SWITCHBOT_SECRET;

if (!token || !secret) {
  console.error("SWITCHBOT_TOKEN / SWITCHBOT_SECRET が設定されていません。");
  process.exit(1);
}

const isOff = process.argv[2] === "off";

let commandLog;

if (isOff) {
  commandLog = {
    power: "off",
    temperature: null,
    mode: null,
    modeLabel: "OFF",
    basedOnJudgment: null,
  };
} else {
  const latest = JSON.parse(await readFile("data/latest.json", "utf8"));

  const judgmentToMode = {
    "エアコン（冷房）": { mode: AC_MODE.COOL, label: "冷房" },
    "エアコン（暖房）またはストーブ": { mode: AC_MODE.HEAT, label: "暖房" },
  };

  const matched = judgmentToMode[latest.judgment];

  if (!matched) {
    console.log(`現在の判定は「${latest.judgment}」のため、エアコン操作の対象外です。何もしません。`);
    process.exit(0);
  }

  commandLog = {
    power: "on",
    temperature: latest.recommendedTemperature,
    mode: matched.mode,
    modeLabel: matched.label,
    basedOnJudgment: { judgment: latest.judgment, reason: latest.reason, updatedAt: latest.updatedAt },
  };
}

console.log("=== 以下の内容でエアコンを操作します ===");
console.log(JSON.stringify(commandLog, null, 2));
console.log("==========================================");

await sendAcCommand({
  token,
  secret,
  deviceId: config.switchbotAcDeviceId,
  temperature: commandLog.temperature ?? 23,
  mode: commandLog.mode ?? AC_MODE.COOL,
  fanSpeed: AC_FAN_SPEED.AUTO,
  power: commandLog.power,
});

const record = {
  sentAt: new Date().toISOString(),
  ...commandLog,
  note: "赤外線リモコン経由のため、エアコンが実際にこの通り反応したかはAPIでは確認できません。目視で確認してください。",
};

await writeFile("data/ac-last-command.json", JSON.stringify(record, null, 2) + "\n");

console.log("エアコンにコマンドを送信し、記録を data/ac-last-command.json に保存しました。");
