// 秘匿情報ではない設定値（トークン等はGitHub Secrets／.envで管理）
export const config = {
  switchbotDeviceId: "E7760106765E", // SwitchBot 温湿度計
  amedasStationId: "14163", // 気象庁アメダス観測地点：札幌
  alpha: 0, // 絶対湿度の許容差分（初期値。チューニング対象）
};
