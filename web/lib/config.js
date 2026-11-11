// 秘匿情報ではない設定値（バックエンド側 src/config.js と同じ値）
export const config = {
  githubOwner: "ktarotaro",
  githubRepo: "madoake-aircon-app",
  githubBranch: "main",
  latestJsonPath: "data/latest.json",
  acLastCommandPath: "data/ac-last-command.json",
  pushSubscriptionsPath: "data/push-subscriptions.json",
  switchbotAcDeviceId: "02-202607221902-63118021",
  heatingPlanPath: "data/heating-plan.json",
  vapidSubject: "mailto:koutaro.miyamoto@gmail.com",

  // 翌日の暖房の段取り（2026-11-11追加）。根拠はVaultの projects/home-energy/home-energy.md「予報別の運用」
  jmaForecastUrl: "https://www.jma.go.jp/bosai/forecast/data/forecast/016000.json", // 石狩・空知・後志地方
  jmaTempPointCode: "14163", // 気温の予報地点：札幌（アメダスと同じ地点）
  heatingThresholds: {
    veryColdMax: 0, // 最高がこれ未満なら真冬日 → 蓄熱「強め」
    coldMin: -5, // 最低がこれ以下なら → 蓄熱「中くらい」
    mildMax: 5, // 最高がこれ未満なら → 蓄熱「弱め」。以上なら「切る〜最小」
  },
  vapidPublicKey: "BC3yh0p2RQrrb6CL7TKJ2DuJ9WFobZnt-hfL8GVnjuQRDGOX_SJwjOduyGJHqJzKHr8JJol-uU4t-ELjplBVRxs",
};
