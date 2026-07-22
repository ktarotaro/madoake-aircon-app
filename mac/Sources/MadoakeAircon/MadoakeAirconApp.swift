import SwiftUI

@main
struct MadoakeAirconApp: App {
    @StateObject private var viewModel = AppViewModel()

    var body: some Scene {
        MenuBarExtra(menuBarTitle, systemImage: menuBarIcon) {
            ContentView()
                .environmentObject(viewModel)
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
