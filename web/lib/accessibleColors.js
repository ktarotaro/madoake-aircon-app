// アプリ全体で使う文字色を一元管理する。
//
// Appleのシステムカラー（macOS）の値をそのまま採用する方針
// （2026-07-23、コントラスト比よりシステムカラーを優先する本人の判断による。
// macOSアプリ側もColor.green/.orange/.red/.blue等のネイティブAPIに統一済み）。
export const accessibleColors = {
  primary: "#000000",
  secondary: "#8E8E93", // systemGray
  success: "#28CD41", // systemGreen
  warning: "#FF9500", // systemOrange
  error: "#FF3B30", // systemRed
  info: "#007AFF", // systemBlue
};
