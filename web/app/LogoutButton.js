"use client";

import { useRouter } from "next/navigation";
import { accessibleColors } from "../lib/accessibleColors";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{ fontSize: 12, color: accessibleColors.secondary, background: "none", border: "none", cursor: "pointer", padding: 0 }}
    >
      ログアウト
    </button>
  );
}
