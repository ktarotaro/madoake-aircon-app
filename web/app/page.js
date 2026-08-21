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

// CO2区分・快適さ区分に共通の色マップ（green/yellow/redをアプリの配色に変換）
const levelColors = {
  green: accessibleColors.success,
  yellow: accessibleColors.warning,
  red: accessibleColors.error,
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
    co2Note,
    indoor,
    outdoor,
    indoorDI,
    outdoorDI,
    indoorAH,
    outdoorAH,
    updatedAt,
    acFeedback,
    overcoolingWarning,
    co2Level,
    comfortLevel,
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
      {co2Note && <p style={{ color: accessibleColors.warning }}>💨 {co2Note}</p>}

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
          <h2 style={{ fontSize: 14, color: accessibleColors.secondary, display: "flex", alignItems: "center", gap: 6 }}>
            室内
            {comfortLevel && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: "bold",
                  color: "#fff",
                  backgroundColor: levelColors[comfortLevel.color] ?? accessibleColors.secondary,
                  padding: "1px 6px",
                  borderRadius: 3,
                }}
              >
                {comfortLevel.level}
              </span>
            )}
          </h2>
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

      {indoor.co2 != null && (
        <>
          <hr style={{ margin: "16px 0", borderColor: "#eee" }} />
          <section>
            <h2 style={{ fontSize: 14, color: accessibleColors.secondary, marginBottom: 6 }}>室内CO2濃度</h2>
            <p style={{ display: "flex", alignItems: "baseline", gap: 8, margin: 0 }}>
              <strong style={{ fontSize: 20, color: levelColors[co2Level?.color] ?? accessibleColors.primary }}>
                {indoor.co2} ppm
              </strong>
              {co2Level && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: "#fff",
                    backgroundColor: levelColors[co2Level.color] ?? accessibleColors.secondary,
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  {co2Level.level}
                </span>
              )}
            </p>
            {co2Level && (
              <p style={{ fontSize: 13, color: accessibleColors.secondary, marginTop: 6 }}>{co2Level.description}</p>
            )}
          </section>
        </>
      )}

      <hr style={{ margin: "16px 0", borderColor: "#eee" }} />

      <section style={{ fontSize: 12, color: accessibleColors.secondary, lineHeight: 1.6 }}>
        <h3 style={{ fontSize: 13, color: accessibleColors.primary, marginBottom: 8 }}>指標の説明</h3>
        <p style={{ marginBottom: 6 }}>
          <strong>DI（不快指数）</strong>：気温と湿度から快適さを判定
        </p>
        <p style={{ fontSize: 11, color: accessibleColors.secondary, marginLeft: 12, marginBottom: 12 }}>
          ≤60: 快適 / 60-70: やや暑い / &gt;70: 不快（このアプリは70が判定基準）
        </p>
        <p style={{ marginBottom: 6 }}>
          <strong>AH（絶対湿度）</strong>：実際に空気に含まれている水分量（g/m³）。相対湿度が同じでも気温が低いほど絶対湿度は低くなります。
        </p>
        <p style={{ marginTop: 12, marginBottom: 6 }}>
          <strong>快適さ</strong>：室内の温度・湿度から判定（窓開け/エアコンの判定基準と同じ境界を使用）
        </p>
        <p style={{ fontSize: 11, color: accessibleColors.secondary, marginLeft: 12, marginBottom: 12 }}>
          18℃未満: 寒い / DI&gt;70: 暑い / それ以外: 快適
        </p>
        <p style={{ marginTop: 12, marginBottom: 6 }}>
          <strong>CO2濃度</strong>：室内の空気の淀み具合（CO2センサー付属マニュアルの基準に準拠）
        </p>
        <p style={{ fontSize: 11, color: accessibleColors.secondary, marginLeft: 12 }}>
          400-1000: 良好（換気の良い居住空間の一般的なレベル） / 1000-1400: 注意（十分でない酸素濃度で、眠く不快なレベル） / 1400以上: 要換気（すぐに換気が必要）
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
