import SwiftUI

struct ContentView: View {
    @EnvironmentObject var viewModel: AppViewModel
    @State private var pendingAction: PendingAction?
    @State private var launchAtLogin: Bool = LoginItemService.isEnabled

    private var launchAtLoginBinding: Binding<Bool> {
        Binding(
            get: { launchAtLogin },
            set: { newValue in
                launchAtLogin = newValue
                LoginItemService.setEnabled(newValue)
            }
        )
    }

    enum PendingAction: Identifiable {
        case on
        case off
        var id: String { self == .on ? "on" : "off" }
    }

    var body: some View {
        Group {
            if !viewModel.isLoggedIn {
                LoginView()
            } else if let latest = viewModel.latest {
                dashboard(latest)
            } else if viewModel.isLoading {
                ProgressView("読み込み中…")
                    .padding(24)
                    .frame(width: 320)
            } else {
                VStack(spacing: 8) {
                    Text(viewModel.errorMessage ?? "データがありません")
                        .font(.caption)
                    Button("再読み込み") { Task { await viewModel.refresh() } }
                }
                .padding(16)
                .frame(width: 320)
            }
        }
    }

    // MenuBarExtra(.window)内では.confirmationDialog/.alertが正しく閉じないことがあるため、
    // システムのモーダルではなく画面内に直接確認UIを表示する方式にしている。
    @ViewBuilder
    private func confirmationRow(_ latest: LatestData) -> some View {
        if let action = pendingAction {
            VStack(alignment: .leading, spacing: 6) {
                Text(confirmationTitle(action, latest))
                    .font(.caption)
                    .bold()
                HStack(spacing: 8) {
                    Button("実行する") {
                        Task { await viewModel.executeAc(action: action == .on ? "on" : "off") }
                        pendingAction = nil
                    }
                    Button("キャンセル") { pendingAction = nil }
                }
            }
            .padding(8)
            .background(Color.gray.opacity(0.15))
            .cornerRadius(6)
        }
    }

    private func confirmationTitle(_ action: PendingAction, _ latest: LatestData) -> String {
        if action == .off {
            return "エアコンをOFFにします。よろしいですか？"
        }
        let temp = latest.recommendedTemperature.map { "\($0)℃" } ?? ""
        let fanSpeed = latest.recommendedFanSpeed ?? "自動"
        return "\(latest.modeLabel ?? "")・\(temp)・\(fanSpeed) でエアコンを操作します。よろしいですか？"
    }

    @ViewBuilder
    private func dashboard(_ latest: LatestData) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                Text("窓開け／エアコン判断アプリ")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(latest.judgment)
                    .font(.system(size: 24, weight: .bold))

                Text(latest.reason)
                    .font(.callout)
                    .foregroundColor(.secondary)

                if let temp = latest.recommendedTemperature {
                    Text("推奨設定温度: \(temp, specifier: "%.1f")℃")
                        .font(.callout)
                        .bold()
                }

                if let fanSpeed = latest.recommendedFanSpeed {
                    Text("推奨風量: \(fanSpeed)")
                        .font(.callout)
                        .bold()
                }

                if let note = latest.humidityNote {
                    Text("⚠ \(note)")
                        .font(.caption)
                        .foregroundColor(Self.warningColor)
                }

                HStack(spacing: 8) {
                    if latest.isAcExecutable {
                        Button("この設定で実行する") { pendingAction = .on }
                            .buttonStyle(.borderedProminent)
                    }
                    Button("エアコンをOFFにする") { pendingAction = .off }
                }
                .disabled(viewModel.isLoading || pendingAction != nil)

                confirmationRow(latest)

                if let result = viewModel.actionResultMessage {
                    Text(result).font(.caption).foregroundColor(Self.successColor)
                }
                if let error = viewModel.errorMessage {
                    Text(error).font(.caption).foregroundColor(Self.errorColor)
                }
                if let feedback = latest.acFeedback {
                    Text(feedback.message)
                        .font(.caption)
                        .foregroundColor(feedbackColor(feedback.status))
                }

                if let warning = latest.overcoolingWarning {
                    Text("❄️ \(warning)")
                        .font(.caption)
                        .foregroundColor(Self.infoColor)
                }

                Divider()

                HStack(alignment: .top, spacing: 20) {
                    readingColumn(title: "室内", reading: latest.indoor.temperature, humidity: latest.indoor.humidity, di: latest.indoorDI, ah: latest.indoorAH)
                    readingColumn(title: "屋外（札幌）", reading: latest.outdoor.temperature, humidity: latest.outdoor.humidity, di: latest.outdoorDI, ah: latest.outdoorAH)
                }

                Divider()

                VStack(alignment: .leading, spacing: 4) {
                    Text("指標の説明").font(.caption).bold()
                    Text("DI（不快指数）：≤60 快適 / 60-70 やや暑い / >70 不快（判定基準）")
                        .font(.caption2).foregroundColor(.secondary)
                    Text("AH（絶対湿度）：実際の水分量(g/m³)。気温が低いほど同じ相対湿度でも値は小さくなる")
                        .font(.caption2).foregroundColor(.secondary)
                }

                Text("最終更新: \(formattedDate(latest.updatedAtDate))")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                Toggle("ログイン時に自動起動", isOn: launchAtLoginBinding)
                    .font(.caption)
                    .toggleStyle(.switch)

                HStack {
                    Button("再読み込み") { Task { await viewModel.refresh() } }
                        .font(.caption)
                    Spacer()
                    Button("ログアウト") { viewModel.logout() }
                        .font(.caption)
                }
            }
            .padding(16)
        }
        .frame(width: 340, height: 480)
        // メニューバーポップオーバー標準の半透明背景だと、その上に乗る文字色の
        // コントラスト比を保証できない（壁紙により実効背景色が変わるため）。
        // 不透明な白に固定することで、下記の文字色が確実に4.5:1以上になるようにしている
        // （2026-07-23、本人の指摘を受けて変更）。
        .background(Color.white)
    }

    private func readingColumn(title: String, reading: Double, humidity: Double, di: Double, ah: Double) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.caption).foregroundColor(.secondary)
            Text("\(reading, specifier: "%.1f")℃ / \(humidity, specifier: "%.0f")%")
                .font(.callout)
            Text("DI: \(di, specifier: "%.1f")").font(.caption2).foregroundColor(.secondary)
            Text("AH: \(ah, specifier: "%.1f") g/m³").font(.caption2).foregroundColor(.secondary)
        }
    }

    // 背景（白、Color.white）に対してコントラスト比4.5:1以上（WCAG AA）になるよう、
    // 標準のColor.green/.orange/.red/.blueより明度を落とした色を明示的に指定している。
    // 太字は視認性改善の効果が薄いため使わず、色のコントラストだけで対応する
    // （2026-07-23、本人の指摘を受けて変更。各色の対白コントラスト比：緑7.1:1、
    // 橙7.1:1、赤6.5:1、青5.2:1）。
    static let successColor = Color(red: 0x16 / 255, green: 0x65 / 255, blue: 0x34 / 255) // #166534
    static let warningColor = Color(red: 0x92 / 255, green: 0x40 / 255, blue: 0x0e / 255) // #92400E
    static let errorColor = Color(red: 0xb9 / 255, green: 0x1c / 255, blue: 0x1c / 255) // #B91C1C
    static let infoColor = Color(red: 0x25 / 255, green: 0x63 / 255, blue: 0xeb / 255) // #2563EB

    private func feedbackColor(_ status: String) -> Color {
        switch status {
        case "ok": return Self.successColor
        case "warning": return Self.warningColor
        default: return .secondary
        }
    }

    private func formattedDate(_ date: Date?) -> String {
        guard let date else { return "-" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ja_JP")
        formatter.dateFormat = "yyyy/M/d HH:mm:ss"
        return formatter.string(from: date)
    }
}
