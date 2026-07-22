const AMEDAS_BASE = "https://www.jma.go.jp/bosai/amedas";

// 気象庁アメダスの最新観測値を取得する。戻り値: { temperature, humidity, precipitation10m }
export async function getAmedasStatus({ stationId }) {
  const latestTimeRes = await fetch(`${AMEDAS_BASE}/data/latest_time.txt`);
  const latestTimeText = (await latestTimeRes.text()).trim();
  // 例: "2026-07-22T18:00:00+09:00" -> "20260722180000"
  const timestamp = latestTimeText.split("+")[0].replace(/[-T:]/g, "");

  const dataRes = await fetch(`${AMEDAS_BASE}/data/map/${timestamp}.json`);
  const data = await dataRes.json();
  const station = data[stationId];

  if (!station) {
    throw new Error(`気象庁アメダスに観測地点 ${stationId} のデータが見つかりません`);
  }

  return {
    temperature: station.temp?.[0] ?? null,
    humidity: station.humidity?.[0] ?? null,
    precipitation10m: station.precipitation10m?.[0] ?? 0,
    observedAt: latestTimeText,
  };
}
