import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateAcFeedback } from "../src/acFeedback.js";

const baseCommand = {
  power: "on",
  mode: 2,
  modeLabel: "冷房",
  sentAt: "2026-07-22T10:00:00.000Z",
  indoorTemperatureAtCommand: 29.9,
};

test("コマンド記録がない → null", () => {
  assert.equal(evaluateAcFeedback({ commandRecord: null, currentIndoorTemperature: 28 }), null);
});

test("OFFコマンドの記録 → null（対象外）", () => {
  const result = evaluateAcFeedback({
    commandRecord: { ...baseCommand, power: "off", indoorTemperatureAtCommand: null },
    currentIndoorTemperature: 28,
  });
  assert.equal(result, null);
});

test("送信から10分後 → まだ確認中", () => {
  const result = evaluateAcFeedback({
    commandRecord: baseCommand,
    currentIndoorTemperature: 29.5,
    now: new Date("2026-07-22T10:10:00.000Z"),
  });
  assert.equal(result.status, "checking");
});

test("送信から20分後、室温が下がっている → 反応している可能性が高い", () => {
  const result = evaluateAcFeedback({
    commandRecord: baseCommand,
    currentIndoorTemperature: 28.9,
    now: new Date("2026-07-22T10:20:00.000Z"),
  });
  assert.equal(result.status, "ok");
});

test("送信から20分後、室温がほぼ変わらない → 反応していない可能性", () => {
  const result = evaluateAcFeedback({
    commandRecord: baseCommand,
    currentIndoorTemperature: 29.8,
    now: new Date("2026-07-22T10:20:00.000Z"),
  });
  assert.equal(result.status, "warning");
});

test("送信から2時間後 → 古すぎるので null", () => {
  const result = evaluateAcFeedback({
    commandRecord: baseCommand,
    currentIndoorTemperature: 25,
    now: new Date("2026-07-22T12:00:00.000Z"),
  });
  assert.equal(result, null);
});
