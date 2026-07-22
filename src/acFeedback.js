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
