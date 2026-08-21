// 秘匿情報ではない設定値（トークン等はGitHub Secrets／.envで管理）
export const config = {
  // 室内の温度・湿度・CO2はすべてこのCO2センサーから取得する（2026-08-21〜）
  switchbotCo2DeviceId: "B0E9FEF961E6", // SwitchBot CO2センサー（温湿度計）W4900010
  // 旧・温湿度計（SWITCHBOTMETER-GH、deviceId: E7760106765E）は2026-08-21に運用終了。
  // CO2センサーが温湿度も測れるため機能が重複しており、本人の方針で一本化した。
  switchbotAcDeviceId: "02-202607221902-63118021", // SwitchBot 赤外線リモコン（エアコン）
  amedasStationId: "14163", // 気象庁アメダス観測地点：札幌
  alpha: 2.0, // 絶対湿度の許容差分（電気代優先のため0→2.0 g/m³に緩和、2026-07-25）
  vapidPublicKey: "BMWHzucf2mk6Rtfpj3nsSHSYJk3DvMYlm-XHwSRJ3oPp_iN1JY2UvaKFfWT5w7EaHXbsM6TOtIpVsH4F2NR80Pk", // Web Push用（公開鍵は非秘匿）
  vapidSubject: "mailto:koutaro.miyamoto@gmail.com",
};
