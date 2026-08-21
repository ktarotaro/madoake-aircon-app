// 窓開け／エアコン判断ロジック
//
// 「夏ロジック／冬ロジック」という季節の決め打ちをせず、室内の実測値（DI・気温・湿度）だけで
// 「暑い／寒い／快適」を毎回判定する統一ロジック（2026-07-22、Handoff-v1.mdの季節限定ロジックから拡張）。

export const COMFORTABLE_DI_THRESHOLD = 70; // これを超えると「暑くて不快」
export const COLD_TEMP_THRESHOLD = 18; // これを下回ると「寒い」（一般的な室内快適温度の下限）
export const DRY_HUMIDITY_THRESHOLD = 40; // これを下回ると「乾燥」
export const HIGH_HUMIDITY_THRESHOLD = 65; // 暑い判定の中でも、これ以上の湿度なら冷房より除湿を優先
export const DEFAULT_ALPHA = 2.0; // 絶対湿度の許容差分（湿気を持ち込むかの判定閾値。電気代優先のため0→2.0 g/m³に緩和、2026-07-25）
export const HEATING_TARGET_TEMP = 20; // 暖房の推奨設定温度（固定値。DIは寒さ側を評価できないため）
export const HIGH_FAN_TEMP_GAP = 5; // 冷房：現在温度と推奨温度の差がこれ以上なら強風
export const MEDIUM_FAN_TEMP_GAP = 2; // 冷房：現在温度と推奨温度の差がこれ以上なら中風
export const COOLING_HUMIDITY_SPLIT = 55; // これ以上の湿度なら基本設定温度を1℃下げる
export const COOLING_BASE_TEMP_LOW_HUMIDITY = 27; // 湿度が低め（55%未満）のときの基本設定温度
export const COOLING_BASE_TEMP_HIGH_HUMIDITY = 26; // 湿度が高め（55%以上）のときの基本設定温度
// CO2濃度の区分（2026-08-20、SwitchBot CO2センサー`W4900010`の付属マニュアル記載の基準表に準拠）。
// 本体LEDの色分けと同じ区切りにすることで、アプリの表示と実機の見た目が食い違わないようにしている。
export const HIGH_CO2_THRESHOLD = 1000; // これを超えると「注意」（換気推奨の通知もこの閾値で出す）
export const VENTILATION_REQUIRED_CO2_THRESHOLD = 1400; // これを超えると「要換気」

// CO2濃度から区分・色・影響の説明を返す。co2が未取得（undefined/null）ならnull。
export function evaluateCo2Level(co2) {
  if (co2 === undefined || co2 === null) return null;

  if (co2 > VENTILATION_REQUIRED_CO2_THRESHOLD) {
    return { level: "要換気", color: "red", description: "すぐに換気が必要です。" };
  }
  if (co2 > HIGH_CO2_THRESHOLD) {
    return { level: "注意", color: "yellow", description: "十分でない酸素濃度で、眠く不快なレベルです。" };
  }
  return { level: "良好", color: "green", description: "換気の良い居住空間の一般的なレベルです。" };
}

// 室内の温度・湿度から快適さを区分・色・説明で返す（2026-08-21追加）。
// 新しい閾値は設けず、既存の判定ロジック（decide()）が実際に使っている境界
// （COLD_TEMP_THRESHOLD・COMFORTABLE_DI_THRESHOLD）とそのまま一致させている。
// DI60〜70の「やや暑い」中間区分は当初検討したが不採用にした：calculateDI()は夏を
// 想定した式（気象庁の不快指数）で、低温・低湿度の環境でも高いDI値が出てしまう
// （例: 20℃/30%でDI64.15）。60を境界に使うと「明らかに快適な環境」を「やや暑い」と
// 誤判定するため、decide()が実際に使う唯一の境界である70のみを採用した。
export function evaluateComfortLevel(temperature, humidity) {
  if (temperature === undefined || temperature === null || humidity === undefined || humidity === null) {
    return null;
  }

  if (temperature < COLD_TEMP_THRESHOLD) {
    return { level: "寒い", color: "red", description: "室温が低く、寒く感じるレベルです。" };
  }

  const di = calculateDI(temperature, humidity);

  if (di > COMFORTABLE_DI_THRESHOLD) {
    return { level: "暑い", color: "red", description: "気温・湿度が高く、蒸し暑く感じるレベルです。" };
  }
  return { level: "快適", color: "green", description: "気温・湿度ともに快適なレベルです。" };
}

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

// 冷房の推奨設定温度：湿度に応じて26〜27℃を基本とするシンプルな方式。
// 従来はDI=70になる気温を逆算していたが、DI70は「快適」ではなく「やや不快の境界」を
// 意味する値であり、湿度が高いと現実的でない低温（23℃台等）が算出される問題があった
// （2026-07-23、本人からのフィードバックを受けて変更）。
export function recommendCoolingTemp(humidity) {
  return humidity >= COOLING_HUMIDITY_SPLIT ? COOLING_BASE_TEMP_HIGH_HUMIDITY : COOLING_BASE_TEMP_LOW_HUMIDITY;
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
 * @param {{temperature: number, humidity: number, co2?: number}} indoor
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
    co2Level: evaluateCo2Level(indoor.co2),
    comfortLevel: evaluateComfortLevel(indoor.temperature, indoor.humidity),
  };

  const humidityNote =
    indoor.humidity < DRY_HUMIDITY_THRESHOLD
      ? "室内が乾燥気味です。加湿器の使用を検討してください。"
      : null;

  const co2Note =
    indoor.co2 !== undefined && indoor.co2 > HIGH_CO2_THRESHOLD
      ? "室内のCO2濃度が高めです。換気をおすすめします。"
      : null;

  // 暑くて不快
  if (indoorDI > COMFORTABLE_DI_THRESHOLD) {
    // 屋外の方が涼しく乾いているだけでなく、屋外条件自体が快適圏（DI以下）であることも確認する。
    // 屋外が「室内よりマシ」なだけで実際は暑い場合、窓を開けても十分涼しくならないため。
    const isOutdoorCoolerAndDrier =
      !isRaining && outdoor.temperature < indoor.temperature && outdoorAH <= indoorAH + alpha;
    const canOpenWindow = isOutdoorCoolerAndDrier && outdoorDI <= COMFORTABLE_DI_THRESHOLD;

    if (canOpenWindow) {
      return {
        judgment: "窓を開ける",
        reason: `外気の方が${round1(indoor.temperature - outdoor.temperature)}℃涼しく、湿気も室内より${outdoorAH <= indoorAH ? "少なめ" : "同程度"}です。`,
        humidityNote,
        co2Note,
        ...metrics,
      };
    }

    const isHumidityDriven = indoor.humidity >= HIGH_HUMIDITY_THRESHOLD;
    const recommendedTemperature = recommendCoolingTemp(indoor.humidity);
    const recommendedFanSpeed = isHumidityDriven
      ? "弱風"
      : recommendCoolingFanSpeed(indoor.temperature, recommendedTemperature);

    let reason;
    if (isRaining) {
      reason = "雨天のため換気非推奨です。";
    } else if (isHumidityDriven) {
      // 除湿を選ぶ理由（室内湿度が高いこと）は、屋外の温度事情より優先して伝える
      reason = "気温よりも湿気が原因の不快感のため、除湿が有効です。";
    } else if (isOutdoorCoolerAndDrier) {
      reason = "外気の方が涼しいですが、屋外も蒸し暑く、窓を開けても十分涼しくなりません。";
    } else {
      reason = "外気を入れると余計蒸し暑くなります。";
    }

    return {
      judgment: isHumidityDriven ? "エアコン（除湿）" : "エアコン（冷房）",
      reason,
      recommendedTemperature,
      recommendedFanSpeed,
      humidityNote,
      co2Note,
      ...metrics,
    };
  }

  // 寒い
  if (indoor.temperature < COLD_TEMP_THRESHOLD) {
    // 暑い側と同様、屋外の方が室内より暖かいだけでなく、屋外条件自体が「寒い」を脱しているか
    // （COLD_TEMP_THRESHOLD以上）も確認する。屋外が「室内よりマシ」なだけでまだ寒い場合、
    // 窓を開けても十分暖まらないため。
    const isOutdoorWarmer = !isRaining && outdoor.temperature > indoor.temperature;
    const canOpenWindow = isOutdoorWarmer && outdoor.temperature >= COLD_TEMP_THRESHOLD;

    if (canOpenWindow) {
      return {
        judgment: "窓を開ける",
        reason: `外気の方が${round1(outdoor.temperature - indoor.temperature)}℃暖かいです。`,
        humidityNote,
        co2Note,
        ...metrics,
      };
    }

    let reason;
    if (isRaining) {
      reason = "雨天かつ室内が冷えています。";
    } else if (isOutdoorWarmer) {
      reason = "外気の方が暖かいですが、屋外もまだ寒く、窓を開けても十分暖まりません。";
    } else {
      reason = "室内が冷えています。";
    }

    return {
      judgment: "エアコン（暖房）またはストーブ",
      reason,
      recommendedTemperature: HEATING_TARGET_TEMP,
      humidityNote,
      co2Note,
      ...metrics,
    };
  }

  // 快適域（湿度だけ乾燥している可能性はhumidityNoteで補足）
  return {
    judgment: "どちらでもいい",
    reason: "室内はすでに快適な状態です。",
    humidityNote,
    co2Note,
    ...metrics,
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
