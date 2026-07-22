// 窓開け／エアコン判断ロジック（Handoff-v1.md 3章準拠）

const COMFORTABLE_DI_THRESHOLD = 70;
const DEFAULT_ALPHA = 0; // 絶対湿度の許容差分（湿気を持ち込むかの判定閾値）

// 不快指数（DI）: 体感の快適さを判定する指標
export function calculateDI(temperature, humidity) {
  return 0.81 * temperature + 0.01 * humidity * (0.99 * temperature - 14.3) + 46.3;
}

// 絶対湿度（AH, g/m³）: 室内外の「実際の水分量」を比較するための仲介指標
// 相対湿度(humidity)は 0-100(%) で受け取り、計算時に 0-1 の比率に変換する
export function calculateAH(temperature, humidity) {
  const saturationVaporPressure = 6.112 * Math.exp((17.62 * temperature) / (243.12 + temperature));
  const relativeHumidityRatio = humidity / 100;
  return (217 * (saturationVaporPressure * relativeHumidityRatio)) / (273.15 + temperature);
}

/**
 * @param {{temperature: number, humidity: number}} indoor
 * @param {{temperature: number, humidity: number}} outdoor
 * @param {number} precipitation10m 直近10分間の降水量(mm)
 * @param {number} [alpha] 絶対湿度の許容差分
 */
export function decide({ indoor, outdoor, precipitation10m, alpha = DEFAULT_ALPHA }) {
  const indoorDI = calculateDI(indoor.temperature, indoor.humidity);
  const outdoorDI = calculateDI(outdoor.temperature, outdoor.humidity);
  const indoorAH = calculateAH(indoor.temperature, indoor.humidity);
  const outdoorAH = calculateAH(outdoor.temperature, outdoor.humidity);

  const metrics = {
    indoorDI: round1(indoorDI),
    outdoorDI: round1(outdoorDI),
    indoorAH: round1(indoorAH),
    outdoorAH: round1(outdoorAH),
  };

  if (precipitation10m > 0) {
    return {
      judgment: "エアコン",
      reason: "雨天のため換気非推奨です。",
      ...metrics,
    };
  }

  if (indoorDI <= COMFORTABLE_DI_THRESHOLD) {
    return {
      judgment: "どちらでもいい",
      reason: "室内はすでに快適な状態です。",
      ...metrics,
    };
  }

  const isOutdoorCooler = outdoor.temperature < indoor.temperature;
  const isOutdoorDrierOrEqual = outdoorAH <= indoorAH + alpha;

  if (isOutdoorCooler && isOutdoorDrierOrEqual) {
    const tempDiff = round1(indoor.temperature - outdoor.temperature);
    const ahDiff = round1(indoorAH - outdoorAH);
    return {
      judgment: "窓を開ける",
      reason: `外気の方が${tempDiff}℃涼しく、湿気も室内より${ahDiff >= 0 ? "少なめ" : "多め"}です。`,
      ...metrics,
    };
  }

  return {
    judgment: "エアコン",
    reason: "外気を入れると余計蒸し暑くなります。",
    ...metrics,
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
