import AcControls from "./AcControls";
import LogoutButton from "./LogoutButton";
import NotificationSubscribeButton from "./NotificationSubscribeButton";
import { accessibleColors } from "../lib/accessibleColors";

export const dynamic = "force-dynamic";

const RAW_URL =
  "https://raw.githubusercontent.com/ktarotaro/madoake-aircon-app/main/data/latest.json";

async function getLatest() {
  const res = await fetch(RAW_URL, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

const modeLabelByJudgment = {
  "エアコン（冷房）": "冷房",
  "エアコン（除湿）": "除湿",
};

const feedbackColor = {
  ok: accessibleColors.success,
  warning: accessibleColors.warning,
  checking: accessibleColors.secondary,
};

export default async function Home() {
  const latest = await getLatest();

  if (!latest) {
    return (
      <main style={{ maxWidth: 480, margin: "40px auto", padding: 16 }}>
        <p>データを取得できませんでした。しばらくして再読み込みしてください。</p>
      </main>
    );
  }

  const {
    judgment,
    reason,
    recommendedTemperature,
    recommendedFanSpeed,
    humidityNote,
    indoor,
    outdoor,
    indoorDI,
    outdoorDI,
    indoorAH,
    outdoorAH,
    updatedAt,
    acFeedback,
    overcoolingWarning,
  } = latest;

  return (
    <main style={{ maxWidth: 480, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 18, color: accessibleColors.secondary, marginBottom: 4 }}>窓開け／エアコン判断アプリ</h1>

      <div style={{ fontSize: 36, fontWeight: "bold", margin: "16px 0" }}>{judgment}</div>
      <p style={{ color: accessibleColors.secondary }}>{reason}</p>
      {recommendedTemperature != null && (
        <p>推奨設定温度: <strong>{recommendedTemperature}℃</strong></p>
      )}
      {recommendedFanSpeed != null && (
        <p>推奨風量: <strong>{recommendedFanSpeed}</strong></p>
      )}
      {humidityNote && <p style={{ color: accessibleColors.warning }}>⚠ {humidityNote}</p>}

      <AcControls
        judgment={judgment}
        recommendedTemperature={recommendedTemperature}
        recommendedFanSpeed={recommendedFanSpeed}
        modeLabel={modeLabelByJudgment[judgment]}
      />

      {acFeedback && (
        <p style={{ marginTop: 16, color: feedbackColor[acFeedback.status] ?? accessibleColors.primary }}>
          {acFeedback.message}
        </p>
      )}

      {overcoolingWarning && (
        <p style={{ marginTop: 8, color: accessibleColors.info }}>❄️ {overcoolingWarning}</p>
      )}

      <hr style={{ margin: "24px 0" }} />

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 14 }}>
        <div>
          <h2 style={{ fontSize: 14, color: accessibleColors.secondary }}>室内</h2>
          <p>{indoor.temperature}℃ / {indoor.humidity}%</p>
          <p style={{ color: accessibleColors.secondary }}>DI: {indoorDI}</p>
          <p style={{ color: accessibleColors.secondary, marginTop: 8 }}>AH: {indoorAH} g/m³</p>
        </div>
        <div>
          <h2 style={{ fontSize: 14, color: accessibleColors.secondary }}>屋外（札幌）</h2>
          <p>{outdoor.temperature}℃ / {outdoor.humidity}%</p>
          <p style={{ color: accessibleColors.secondary }}>DI: {outdoorDI}</p>
          <p style={{ color: accessibleColors.secondary, marginTop: 8 }}>AH: {outdoorAH} g/m³</p>
        </div>
      </section>

      <hr style={{ margin: "16px 0", borderColor: "#eee" }} />

      <section style={{ fontSize: 12, color: accessibleColors.secondary, lineHeight: 1.6 }}>
        <h3 style={{ fontSize: 13, color: accessibleColors.primary, marginBottom: 8 }}>指標の説明</h3>
        <p style={{ marginBottom: 6 }}>
          <strong>DI（不快指数）</strong>：気温と湿度から快適さを判定
        </p>
        <p style={{ fontSize: 11, color: accessibleColors.secondary, marginLeft: 12, marginBottom: 12 }}>
          ≤60: 快適 / 60-70: やや暑い / &gt;70: 不快（このアプリは70が判定基準）
        </p>
        <p>
          <strong>AH（絶対湿度）</strong>：実際に空気に含まれている水分量（g/m³）。相対湿度が同じでも気温が低いほど絶対湿度は低くなります。
        </p>
      </section>

      <p style={{ marginTop: 24, fontSize: 12, color: accessibleColors.secondary }}>
        最終更新: {new Date(updatedAt).toLocaleString("ja-JP")}
      </p>

      <NotificationSubscribeButton />

      <div style={{ marginTop: 8 }}>
        <LogoutButton />
      </div>
    </main>
  );
}
