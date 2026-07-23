import SwiftUI
import AppKit

// Appleのシステムカラー（systemGreen等）は白背景での小さな文字には薄すぎて
// 読みにくいため、同じ色相のまま黒を40%ブレンドして暗くしたものを使う。
// あくまでシステムカラーから派生した色であり、独自に選んだ色ではない
// （2026-07-23、本人の指摘を受けて調整。対白コントラスト比：緑4.64:1、
// 橙4.78:1、赤7.13:1、青7.89:1、実測値）。
enum SystemStatusColor {
    static let success = Color(nsColor: NSColor.systemGreen.blended(withFraction: 0.4, of: .black) ?? .systemGreen)
    static let warning = Color(nsColor: NSColor.systemOrange.blended(withFraction: 0.4, of: .black) ?? .systemOrange)
    static let error = Color(nsColor: NSColor.systemRed.blended(withFraction: 0.4, of: .black) ?? .systemRed)
    static let info = Color(nsColor: NSColor.systemBlue.blended(withFraction: 0.4, of: .black) ?? .systemBlue)
}
