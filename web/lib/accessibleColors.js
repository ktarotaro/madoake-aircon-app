// アプリ全体で使う文字色を一元管理する。
//
// Appleのシステムカラー（macOS）をベースに、黒を40%ブレンドして暗くしたものを
// 採用（2026-07-23）。白背景に対して薄すぎて読みにくかったため、色相はシステム
// カラーのまま保ちつつ、macOSアプリ側（SystemStatusColor.swift）と同じ
// NSColor.blended(withFraction: 0.4, of: .black)で算出した値と統一している。
export const accessibleColors = {
  primary: "#000000",
  secondary: "#5C5C5F", // systemGray 40%暗く（6.66:1）
  success: "#168727", // systemGreen 40%暗く（4.64:1）
  warning: "#A96101", // systemOrange 40%暗く（4.78:1）
  error: "#A9231C", // systemRed 40%暗く（7.13:1）
  info: "#004EA9", // systemBlue 40%暗く（7.89:1）
};
