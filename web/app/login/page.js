"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { accessibleColors } from "../../lib/accessibleColors";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("パスワードが違います");
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>窓開け／エアコン判断アプリ</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          autoFocus
          style={{ width: "100%", padding: 8, fontSize: 16, boxSizing: "border-box" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 8, marginTop: 8, fontSize: 16 }}
        >
          {loading ? "確認中…" : "ログイン"}
        </button>
        {error && <p style={{ color: accessibleColors.error, marginTop: 8 }}>{error}</p>}
      </form>
    </main>
  );
}
