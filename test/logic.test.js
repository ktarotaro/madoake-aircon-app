import { test } from "node:test";
import assert from "node:assert/strict";
import { decide } from "../src/logic.js";

test("暑い・屋外の方が涼しく乾いている → 窓を開ける", () => {
  const result = decide({
    indoor: { temperature: 29.7, humidity: 59 },
    outdoor: { temperature: 23.9, humidity: 81 },
    precipitation10m: 0,
  });
  assert.equal(result.judgment, "窓を開ける");
});

test("暑い・屋外の方が湿っている → エアコン（冷房）と推奨温度が出る", () => {
  const result = decide({
    indoor: { temperature: 29.9, humidity: 58 },
    outdoor: { temperature: 23.6, humidity: 84 },
    precipitation10m: 0,
  });
  assert.equal(result.judgment, "エアコン（冷房）");
  assert.ok(result.recommendedTemperature > 0);
});

test("雨天 → 暑くても窓を開けない", () => {
  const result = decide({
    indoor: { temperature: 30, humidity: 60 },
    outdoor: { temperature: 20, humidity: 50 },
    precipitation10m: 1,
  });
  assert.equal(result.judgment, "エアコン（冷房）");
});

test("寒い・屋外の方がさらに寒い → エアコン（暖房）またはストーブ", () => {
  const result = decide({
    indoor: { temperature: 15, humidity: 45 },
    outdoor: { temperature: 5, humidity: 60 },
    precipitation10m: 0,
  });
  assert.equal(result.judgment, "エアコン（暖房）またはストーブ");
  assert.equal(result.recommendedTemperature, 20);
});

test("寒い・屋外の方が暖かい → 窓を開ける", () => {
  const result = decide({
    indoor: { temperature: 15, humidity: 45 },
    outdoor: { temperature: 22, humidity: 50 },
    precipitation10m: 0,
  });
  assert.equal(result.judgment, "窓を開ける");
});

test("快適だが乾燥 → どちらでもいい、ただし加湿の注意書きが付く", () => {
  const result = decide({
    indoor: { temperature: 21, humidity: 30 },
    outdoor: { temperature: 18, humidity: 50 },
    precipitation10m: 0,
  });
  assert.equal(result.judgment, "どちらでもいい");
  assert.match(result.humidityNote, /加湿/);
});

test("快適・湿度も十分 → どちらでもいい、注意書きなし", () => {
  const result = decide({
    indoor: { temperature: 22, humidity: 50 },
    outdoor: { temperature: 20, humidity: 55 },
    precipitation10m: 0,
  });
  assert.equal(result.judgment, "どちらでもいい");
  assert.equal(result.humidityNote, null);
});
