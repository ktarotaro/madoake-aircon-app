// 赤外線リモコンは一方通行のため、エアコンが実際にコマンド通り反応したかをAPIでは確認できない。
// 代わりに「コマンド送信後、室温が期待する方向に動いているか」から間接的に推測する。
// 100%の確証にはならないため、あくまで参考情報として扱うこと（最終確認は目視）。

const CHECK_WINDOW_START_MIN = 15; // これより前は判定しない（エアコンの効果が出るまでの猶予）
const CHECK_WINDOW_END_MIN = 90; // これより後は判定対象外（古すぎるコマンドは無視）
const MEANINGFUL_TEMP_CHANGE = 0.3; // ℃。これ以上動いていれば「反応あり」とみなす

export function evaluateAcFeedback({ commandRecord, currentIndoorTemperature, now = new Date() }) {
  if (!commandRecord || commandRecord.power !== "on" || commandRecord.indoorTemperatureAtCommand == null) {
    return null;
  }

  const elapsedMin = (now.getTime() - new Date(commandRecord.sentAt).getTime()) / 60000;

  if (elapsedMin < CHECK_WINDOW_START_MIN) {
    return { status: "checking", message: `エアコンへの反応を確認中です（送信から${Math.round(elapsedMin)}分経過）。` };
  }

  if (elapsedMin > CHECK_WINDOW_END_MIN) {
    return null;
  }

  const tempChange = currentIndoorTemperature - commandRecord.indoorTemperatureAtCommand;
  const roundedChange = Math.round(tempChange * 10) / 10;

  if (tempChange <= -MEANINGFUL_TEMP_CHANGE) {
    return {
      status: "ok",
      message: `${commandRecord.modeLabel}に反応している可能性が高いです（送信時より${Math.abs(roundedChange)}℃低下）。`,
    };
  }

  return {
    status: "warning",
    message: `${commandRecord.modeLabel}に反応していない可能性があります。ご確認ください（送信時からの変化：${roundedChange}℃）。`,
  };
}

// 冷房・除湿を送信した後、室温が推奨設定温度より下がりすぎていないかをチェックする（冷えすぎ通知）。
// commandRecordのmodeLabelで冷房・除湿かどうかを判定する（暖房は自動操作の対象外のため考慮不要）。
const OVERCOOL_MARGIN = 2; // ℃。目標温度よりこれ以上下がっていたら「下がりすぎ」とみなす
const OVERCOOL_CHECK_START_MIN = 15; // これより前は判定しない（エアコンの効果が出るまでの猶予）
const OVERCOOL_CHECK_END_MIN = 24 * 60; // これより後は判定対象外（1日以上前のコマンドは信頼しない）

export function evaluateOvercooling({ commandRecord, currentIndoorTemperature, now = new Date() }) {
  if (!commandRecord || commandRecord.power !== "on" || commandRecord.temperature == null) {
    return null;
  }
  if (commandRecord.modeLabel !== "冷房" && commandRecord.modeLabel !== "除湿") {
    return null;
  }

  const elapsedMin = (now.getTime() - new Date(commandRecord.sentAt).getTime()) / 60000;
  if (elapsedMin < OVERCOOL_CHECK_START_MIN || elapsedMin > OVERCOOL_CHECK_END_MIN) {
    return null;
  }

  if (currentIndoorTemperature <= commandRecord.temperature - OVERCOOL_MARGIN) {
    return `室温が目標(${commandRecord.temperature}℃)より下がりすぎています（現在${currentIndoorTemperature}℃）。エアコンの設定を確認してください。`;
  }

  return null;
}
