import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNotificationMessages } from "../src/pushNotifications.js";

test("初回実行（previousがnull） → 通知なし", () => {
  const messages = buildNotificationMessages(null, { judgment: "窓を開ける", reason: "涼しいので", humidityNote: null });
  assert.deepEqual(messages, []);
});

test("判定が変わった → 通知1件", () => {
  const previous = { judgment: "どちらでもいい", humidityNote: null };
  const current = { judgment: "窓を開ける", reason: "涼しいので", humidityNote: null };
  const messages = buildNotificationMessages(previous, current);
  assert.equal(messages.length, 1);
  assert.match(messages[0].title, /窓を開ける/);
});

test("判定が同じ → 通知なし", () => {
  const previous = { judgment: "どちらでもいい", humidityNote: null };
  const current = { judgment: "どちらでもいい", reason: "快適です", humidityNote: null };
  assert.deepEqual(buildNotificationMessages(previous, current), []);
});

test("乾燥注意が新たに出た → 通知1件", () => {
  const previous = { judgment: "どちらでもいい", humidityNote: null };
  const current = { judgment: "どちらでもいい", reason: "快適です", humidityNote: "乾燥気味です" };
  const messages = buildNotificationMessages(previous, current);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].title, "乾燥注意");
});

test("乾燥注意が解消した → 通知1件", () => {
  const previous = { judgment: "どちらでもいい", humidityNote: "乾燥気味です" };
  const current = { judgment: "どちらでもいい", reason: "快適です", humidityNote: null };
  const messages = buildNotificationMessages(previous, current);
  assert.equal(messages.length, 1);
  assert.match(messages[0].title, /解消/);
});

test("判定・乾燥注意の両方が変わった → 通知2件", () => {
  const previous = { judgment: "どちらでもいい", humidityNote: null };
  const current = { judgment: "エアコン（暖房）またはストーブ", reason: "寒いです", humidityNote: "乾燥気味です" };
  const messages = buildNotificationMessages(previous, current);
  assert.equal(messages.length, 2);
});
