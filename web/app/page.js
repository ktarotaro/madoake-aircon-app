import AcControls from "./AcControls";

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

const feedbackColor = { ok: "#16a34a", warning: "#d97706", checking: "#6b7280" };

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
    humidityNote,
    indoor,
    outdoor,
    indoorDI,
    outdoorDI,
    updatedAt,
    acFeedback,
  } = latest;

  return (
    <main style={{ maxWidth: 480, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 18, color: "#666", marginBottom: 4 }}>窓開け／エアコン判断アプリ</h1>

      <div style={{ fontSize: 36, fontWeight: "bold", margin: "16px 0" }}>{judgment}</div>
      <p style={{ color: "#444" }}>{reason}</p>
      {recommendedTemperature != null && (
        <p>推奨設定温度: <strong>{recommendedTemperature}℃</strong></p>
      )}
      {humidityNote && <p style={{ color: "#d97706" }}>⚠ {humidityNote}</p>}

      <AcControls
        judgment={judgment}
        recommendedTemperature={recommendedTemperature}
        modeLabel={modeLabelByJudgment[judgment]}
      />

      {acFeedback && (
        <p style={{ marginTop: 16, color: feedbackColor[acFeedback.status] ?? "#333" }}>
          {acFeedback.message}
        </p>
      )}

      <hr style={{ margin: "24px 0" }} />

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 14 }}>
        <div>
          <h2 style={{ fontSize: 14, color: "#666" }}>室内</h2>
          <p>{indoor.temperature}℃ / {indoor.humidity}%</p>
          <p style={{ color: "#888" }}>DI: {indoorDI}</p>
        </div>
        <div>
          <h2 style={{ fontSize: 14, color: "#666" }}>屋外（札幌）</h2>
          <p>{outdoor.temperature}℃ / {outdoor.humidity}%</p>
          <p style={{ color: "#888" }}>DI: {outdoorDI}</p>
        </div>
      </section>

      <p style={{ marginTop: 24, fontSize: 12, color: "#999" }}>
        最終更新: {new Date(updatedAt).toLocaleString("ja-JP")}
      </p>
    </main>
  );
}
