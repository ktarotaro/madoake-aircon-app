// 窓開け／エアコン判断ロジック
//
// 「夏ロジック／冬ロジック」という季節の決め打ちをせず、室内の実測値（DI・気温・湿度）だけで
// 「暑い／寒い／快適」を毎回判定する統一ロジック（2026-07-22、Handoff-v1.mdの季節限定ロジックから拡張）。

export const COMFORTABLE_DI_THRESHOLD = 70; // これを超えると「暑くて不快」
export const COLD_TEMP_THRESHOLD = 18; // これを下回ると「寒い」（一般的な室内快適温度の下限）
export const DRY_HUMIDITY_THRESHOLD = 40; // これを下回ると「乾燥」
export const HIGH_HUMIDITY_THRESHOLD = 65; // 暑い判定の中でも、これ以上の湿度なら冷房より除湿を優先
export const DEFAULT_ALPHA = 0; // 絶対湿度の許容差分（湿気を持ち込むかの判定閾値）
export const HEATING_TARGET_TEMP = 20; // 暖房の推奨設定温度（固定値。DIは寒さ側を評価できないため）
export const HIGH_FAN_TEMP_GAP = 5; // 冷房：現在温度と推奨温度の差がこれ以上なら強風
export const MEDIUM_FAN_TEMP_GAP = 2; // 冷房：現在温度と推奨温度の差がこれ以上なら中風

// 不快指数（DI）: 体感の快適さを判定する指標（暑さ側のみ意味を持つ）
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

// DI計算式を気温について逆算し、「目標DIちょうどになる気温」を求める（湿度は現在値のまま据え置き）
export function solveCoolingTargetTemp(humidity, targetDI = COMFORTABLE_DI_THRESHOLD) {
  return (targetDI - 46.3 + 0.143 * humidity) / (0.81 + 0.0099 * humidity);
}

// 冷房時の推奨風量：現在の室温と推奨設定温度の差（＝下げる必要がある幅）から決める。
// 除湿は常に弱風固定（強風にしても除湿効率は大きく上がらず、体感的に冷えすぎるため）。
export function recommendCoolingFanSpeed(currentTemperature, recommendedTemperature) {
  const gap = currentTemperature - recommendedTemperature;
  if (gap >= HIGH_FAN_TEMP_GAP) return "強風";
  if (gap >= MEDIUM_FAN_TEMP_GAP) return "中風";
  return "自動";
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
  const isRaining = precipitation10m > 0;

  const metrics = {
    indoorDI: round1(indoorDI),
    outdoorDI: round1(outdoorDI),
    indoorAH: round1(indoorAH),
    outdoorAH: round1(outdoorAH),
  };

  const humidityNote =
    indoor.humidity < DRY_HUMIDITY_THRESHOLD
      ? "室内が乾燥気味です。加湿器の使用を検討してください。"
      : null;

  // 暑くて不快
  if (indoorDI > COMFORTABLE_DI_THRESHOLD) {
    const canOpenWindow =
      !isRaining && outdoor.temperature < indoor.temperature && outdoorAH <= indoorAH + alpha;

    if (canOpenWindow) {
      return {
        judgment: "窓を開ける",
        reason: `外気の方が${round1(indoor.temperature - outdoor.temperature)}℃涼しく、湿気も室内より${outdoorAH <= indoorAH ? "少なめ" : "同程度"}です。`,
        humidityNote,
        ...metrics,
      };
    }

    const isHumidityDriven = indoor.humidity >= HIGH_HUMIDITY_THRESHOLD;
    const recommendedTemperature = round1(solveCoolingTargetTemp(indoor.humidity));
    const recommendedFanSpeed = isHumidityDriven
      ? "弱風"
      : recommendCoolingFanSpeed(indoor.temperature, recommendedTemperature);

    return {
      judgment: isHumidityDriven ? "エアコン（除湿）" : "エアコン（冷房）",
      reason: isRaining
        ? "雨天のため換気非推奨です。"
        : isHumidityDriven
          ? "気温よりも湿気が原因の不快感のため、除湿が有効です。"
          : "外気を入れると余計蒸し暑くなります。",
      recommendedTemperature,
      recommendedFanSpeed,
      humidityNote,
      ...metrics,
    };
  }

  // 寒い
  if (indoor.temperature < COLD_TEMP_THRESHOLD) {
    const canOpenWindow = !isRaining && outdoor.temperature > indoor.temperature;

    if (canOpenWindow) {
      return {
        judgment: "窓を開ける",
        reason: `外気の方が${round1(outdoor.temperature - indoor.temperature)}℃暖かいです。`,
        humidityNote,
        ...metrics,
      };
    }

    return {
      judgment: "エアコン（暖房）またはストーブ",
      reason: isRaining ? "雨天かつ室内が冷えています。" : "室内が冷えています。",
      recommendedTemperature: HEATING_TARGET_TEMP,
      humidityNote,
      ...metrics,
    };
  }

  // 快適域（湿度だけ乾燥している可能性はhumidityNoteで補足）
  return {
    judgment: "どちらでもいい",
    reason: "室内はすでに快適な状態です。",
    humidityNote,
    ...metrics,
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
