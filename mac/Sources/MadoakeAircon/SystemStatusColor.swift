import SwiftUI
import AppKit

// このアプリは背景を常に白に固定している（.background(Color.white)）ため、
// 文字色も常に固定値（16進数）で指定する。SwiftUIのシステムカラー（.primary/.secondary/
// systemGreen等）やNSColorのDynamic Colorは、ダークモード時に明るい色として解決されて
// しまい、白背景の上で見えなくなる（2026-08-28に発覚：MenuBarExtra(.window)スタイルでは
// .preferredColorScheme(.light)の指定が効かないケースがあるため）。
// Web版のaccessibleColors.jsと同じ16進値を使い、両者で表示を統一している。
enum SystemStatusColor {
    static let primary = Color(hex: 0x000000)
    static let secondary = Color(hex: 0x5C5C5F) // systemGray 40%暗く（対白コントラスト比6.66:1）
    static let success = Color(hex: 0x168727) // systemGreen 40%暗く（4.64:1）
    static let warning = Color(hex: 0xA96101) // systemOrange 40%暗く（4.78:1）
    static let error = Color(hex: 0xA9231C) // systemRed 40%暗く（7.13:1）
    static let info = Color(hex: 0x004EA9) // systemBlue 40%暗く（7.89:1）
}

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}
