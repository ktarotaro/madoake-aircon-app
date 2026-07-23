import SwiftUI

@main
struct MadoakeAirconApp: App {
    @StateObject private var viewModel = AppViewModel()

    var body: some Scene {
        MenuBarExtra(menuBarTitle, systemImage: menuBarIcon) {
            ContentView()
                .environmentObject(viewModel)
                // 背景を白に固定しているため、ダークモード時に.primary/.secondary等が
                // 白文字化して見えなくなるのを防ぐ（2026-07-23）。
                .preferredColorScheme(.light)
        }
        .menuBarExtraStyle(.window)
    }

    private var menuBarTitle: String {
        viewModel.latest?.judgment ?? "窓開け／エアコン"
    }

    private var menuBarIcon: String {
        guard let judgment = viewModel.latest?.judgment else { return "questionmark.circle" }
        switch judgment {
        case "窓を開ける": return "wind"
        case "エアコン（冷房）": return "snowflake"
        case "エアコン（除湿）": return "humidity"
        case "エアコン（暖房）またはストーブ": return "flame"
        default: return "checkmark.circle"
        }
    }
}
