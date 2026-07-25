// 秘匿情報ではない設定値（トークン等はGitHub Secrets／.envで管理）
export const config = {
  switchbotDeviceId: "E7760106765E", // SwitchBot 温湿度計
  switchbotAcDeviceId: "02-202607221902-63118021", // SwitchBot 赤外線リモコン（エアコン）
  amedasStationId: "14163", // 気象庁アメダス観測地点：札幌
  alpha: 2.0, // 絶対湿度の許容差分（電気代優先のため0→2.0 g/m³に緩和、2026-07-25）
  vapidPublicKey: "BCDUC3YlJuRhKg59YNauawqODaDhhh2bmLEwDML7QBArCZ8ejskkoE7Kc-rDFeRD_YJ9TdiVUfObQmNH8M6oohY", // Web Push用（公開鍵は非秘匿）
  vapidSubject: "mailto:koutaro.miyamoto@gmail.com",
};
