import { NextResponse } from "next/server";
import { sendAcCommand, AC_MODE, AC_FAN_SPEED } from "../../../lib/switchbot";
import { getJsonFile, putJsonFile } from "../../../lib/github";
import { config } from "../../../lib/config";

const judgmentToMode = {
  "エアコン（冷房）": { mode: AC_MODE.COOL, label: "冷房" },
  "エアコン（除湿）": { mode: AC_MODE.DRY, label: "除湿" },
};

export async function POST(request) {
  const switchbotToken = process.env.SWITCHBOT_TOKEN;
  const switchbotSecret = process.env.SWITCHBOT_SECRET;
  const githubToken = process.env.GITHUB_WRITE_TOKEN;

  if (!switchbotToken || !switchbotSecret || !githubToken) {
    return NextResponse.json({ error: "サーバー側の環境変数が未設定です" }, { status: 500 });
  }

  const { action } = await request.json();

  const repoArgs = {
    token: githubToken,
    owner: config.githubOwner,
    repo: config.githubRepo,
    branch: config.githubBranch,
  };

  let commandLog;

  if (action === "off") {
    commandLog = {
      power: "off",
      temperature: null,
      mode: null,
      modeLabel: "OFF",
      basedOnJudgment: null,
      indoorTemperatureAtCommand: null,
    };
  } else {
    const { data: latest } = await getJsonFile({ ...repoArgs, path: config.latestJsonPath });

    if (!latest) {
      return NextResponse.json({ error: "最新の判定データが取得できませんでした" }, { status: 500 });
    }

    const matched = judgmentToMode[latest.judgment];

    if (!matched) {
      return NextResponse.json(
        {
          error:
            latest.judgment === "エアコン（暖房）またはストーブ"
              ? "安全設定により、暖房のエアコン自動操作はできません。ストーブ等で手動対応してください。"
              : `現在の判定は「${latest.judgment}」のため、エアコン操作の対象外です。`,
        },
        { status: 400 }
      );
    }

    commandLog = {
      power: "on",
      temperature: latest.recommendedTemperature,
      mode: matched.mode,
      modeLabel: matched.label,
      basedOnJudgment: { judgment: latest.judgment, reason: latest.reason, updatedAt: latest.updatedAt },
      indoorTemperatureAtCommand: latest.indoor.temperature,
    };
  }

  try {
    await sendAcCommand({
      token: switchbotToken,
      secret: switchbotSecret,
      deviceId: config.switchbotAcDeviceId,
      temperature: commandLog.temperature ?? 23,
      mode: commandLog.mode ?? AC_MODE.COOL,
      fanSpeed: AC_FAN_SPEED.AUTO,
      power: commandLog.power,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  const record = {
    sentAt: new Date().toISOString(),
    ...commandLog,
    note: "赤外線リモコン経由のため、エアコンが実際にこの通り反応したかはAPIでは確認できません。目視で確認してください。",
    triggeredFrom: "web",
  };

  const { sha } = await getJsonFile({ ...repoArgs, path: config.acLastCommandPath });
  await putJsonFile({
    ...repoArgs,
    path: config.acLastCommandPath,
    data: record,
    message: `Update AC command log from web (${commandLog.power})`,
    sha,
  });

  return NextResponse.json({ ok: true, command: record });
}
