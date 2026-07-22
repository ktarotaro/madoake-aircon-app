// アプリアイコンを生成するスクリプト。`swift scripts/generate-icon.swift` で実行する。
// 1024x1024のPNGを1枚生成し、iconutilで.icnsに変換するのは build-app.sh 側で行う。
import SwiftUI
import AppKit

struct AppIcon: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.20, green: 0.55, blue: 0.95), Color(red: 0.35, green: 0.80, blue: 0.95)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            Image(systemName: "wind")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .foregroundColor(.white)
                .frame(width: 560, height: 560)
                .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 8)
        }
        .frame(width: 1024, height: 1024)
        .clipShape(RoundedRectangle(cornerRadius: 220, style: .continuous))
    }
}

MainActor.assumeIsolated {
    let renderer = ImageRenderer(content: AppIcon())
    renderer.scale = 1.0

    guard let nsImage = renderer.nsImage,
          let tiffData = nsImage.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiffData),
          let pngData = bitmap.representation(using: .png, properties: [:]) else {
        print("アイコン生成に失敗しました")
        exit(1)
    }

    let outputPath = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "icon-1024.png"
    do {
        try pngData.write(to: URL(fileURLWithPath: outputPath))
        print("Generated \(outputPath)")
    } catch {
        print("書き込みに失敗しました: \(error)")
        exit(1)
    }
}
