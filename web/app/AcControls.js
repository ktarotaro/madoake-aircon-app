"use client";

import { useState } from "react";

const AC_JUDGMENTS = ["エアコン（冷房）", "エアコン（除湿）"];

export default function AcControls({ judgment, recommendedTemperature, recommendedFanSpeed, modeLabel }) {
  const [status, setStatus] = useState(null); // null | "loading" | { ok } | { error }

  const canExecute = AC_JUDGMENTS.includes(judgment);

  async function handleExecute() {
    const confirmed = window.confirm(
      `以下の内容でエアコンを操作します。よろしいですか？\n\n${modeLabel}・${recommendedTemperature}℃・${recommendedFanSpeed ?? "自動"}\n\n※実際にエアコンが反応したかは目視で確認してください。`
    );
    if (!confirmed) return;

    setStatus("loading");
    const res = await fetch("/api/apply-ac", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "on" }),
    });
    const body = await res.json();
    setStatus(res.ok ? { ok: true } : { error: body.error });
  }

  async function handleOff() {
    const confirmed = window.confirm("エアコンをOFFにします。よろしいですか？");
    if (!confirmed) return;

    setStatus("loading");
    const res = await fetch("/api/apply-ac", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "off" }),
    });
    const body = await res.json();
    setStatus(res.ok ? { ok: true } : { error: body.error });
  }

  return (
    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      {canExecute && (
        <button
          onClick={handleExecute}
          disabled={status === "loading"}
          style={{ padding: "10px 20px", fontSize: 16, background: "#2563eb", color: "white", border: "none", borderRadius: 6 }}
        >
          この設定でエアコンを実行する
        </button>
      )}
      <button
        onClick={handleOff}
        disabled={status === "loading"}
        style={{ padding: "8px 16px", fontSize: 14, background: "#eee", border: "1px solid #ccc", borderRadius: 6 }}
      >
        エアコンをOFFにする
      </button>

      {status === "loading" && <p>送信中…</p>}
      {status?.ok && <p style={{ color: "green" }}>送信しました。実際に反応しているか目視で確認してください。</p>}
      {status?.error && <p style={{ color: "crimson" }}>エラー: {status.error}</p>}
    </div>
  );
}
