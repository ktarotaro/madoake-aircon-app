import SwiftUI
import AppKit

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
                    .foregroundColor(SystemStatusColor.primary)
                    .padding(24)
                    .frame(width: 320)
                    .background(Color.white)
            } else {
                VStack(spacing: 8) {
                    Text(viewModel.errorMessage ?? "データがありません")
                        .font(.caption)
                        .foregroundColor(SystemStatusColor.primary)
                    Button("再読み込み") { Task { await viewModel.refresh() } }
                        .foregroundColor(SystemStatusColor.primary)
                }
                .padding(16)
                .frame(width: 320)
                .background(Color.white)
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
                    .foregroundColor(SystemStatusColor.primary)
                HStack(spacing: 8) {
                    Button("実行する") {
                        Task { await viewModel.executeAc(action: action == .on ? "on" : "off") }
                        pendingAction = nil
                    }
                    .foregroundColor(SystemStatusColor.primary)
                    Button("キャンセル") { pendingAction = nil }
                        .foregroundColor(SystemStatusColor.primary)
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
        VStack(alignment: .leading, spacing: 10) {
            // ヘッダー（判定結果）
            VStack(alignment: .leading, spacing: 2) {
                Text("窓開け／エアコン判断アプリ")
                    .font(.caption)
                    .foregroundColor(SystemStatusColor.secondary)
                Text(latest.judgment)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(SystemStatusColor.primary)
            }

            // 中央の動的コンテンツ（スクロール可能）
            ScrollView {
                VStack(alignment: .leading, spacing: 6) {
                    Text(latest.reason)
                        .font(.callout)
                        .foregroundColor(SystemStatusColor.secondary)

                    if let temp = latest.recommendedTemperature {
                        Text("推奨温度: \(temp, specifier: "%.1f")℃")
                            .font(.callout)
                            .bold()
                            .foregroundColor(SystemStatusColor.primary)
                    }

                    if let fanSpeed = latest.recommendedFanSpeed {
                        Text("推奨風量: \(fanSpeed)")
                            .font(.callout)
                            .bold()
                            .foregroundColor(SystemStatusColor.primary)
                    }

                    // メイン操作ボタン（推奨風量の下）
                    HStack(spacing: 8) {
                        if latest.isAcExecutable {
                            Button(action: { pendingAction = .on }) {
                                Text("実行する")
                                    .font(.body)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 40)
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        Button(action: { pendingAction = .off }) {
                            Text("OFFにする")
                                .font(.body)
                                .foregroundColor(SystemStatusColor.primary)
                                .frame(maxWidth: .infinity)
                                .frame(height: 40)
                        }
                        .buttonStyle(.bordered)
                    }
                    .disabled(viewModel.isLoading || pendingAction != nil)

                    if let note = latest.humidityNote {
                        Text("⚠ \(note)")
                            .font(.caption)
                            .foregroundColor(SystemStatusColor.warning)
                    }

                    if let note = latest.co2Note {
                        Text("💨 \(note)")
                            .font(.caption)
                            .foregroundColor(SystemStatusColor.warning)
                    }

                    confirmationRow(latest)

                    if let result = viewModel.actionResultMessage {
                        Text(result).font(.caption2).foregroundColor(SystemStatusColor.success)
                    }
                    if let error = viewModel.errorMessage {
                        Text(error).font(.caption2).foregroundColor(SystemStatusColor.error)
                    }
                    if let feedback = latest.acFeedback {
                        Text(feedback.message)
                            .font(.caption2)
                            .foregroundColor(feedbackColor(feedback.status))
                    }

                    if let warning = latest.overcoolingWarning {
                        Text("❄️ \(warning)")
                            .font(.caption2)
                            .foregroundColor(SystemStatusColor.info)
                    }

                    Divider()

                    HStack(alignment: .top, spacing: 12) {
                        readingColumn(title: "室内", reading: latest.indoor.temperature, humidity: latest.indoor.humidity, di: latest.indoorDI, ah: latest.indoorAH, comfortLevel: latest.comfortLevel)
                        readingColumn(title: "屋外", reading: latest.outdoor.temperature, humidity: latest.outdoor.humidity, di: latest.outdoorDI, ah: latest.outdoorAH, comfortLevel: nil)
                    }

                    if let co2 = latest.indoor.co2 {
                        Divider()
                        co2Section(co2: co2, level: latest.co2Level)
                    }

                    Divider()

                    VStack(alignment: .leading, spacing: 2) {
                        Text("指標の説明").font(.caption2).bold().foregroundColor(SystemStatusColor.primary)
                        Text("DI：≤60 快適 / 60-70 やや暑い / >70 不快")
                            .font(.caption2).foregroundColor(SystemStatusColor.secondary)
                        Text("快適さ：18℃未満 寒い / DI>75 暑い / それ以外 快適")
                            .font(.caption2).foregroundColor(SystemStatusColor.secondary)
                        Text("CO2：400-1000 良好 / 1000-1400 注意 / 1400- 要換気")
                            .font(.caption2).foregroundColor(SystemStatusColor.secondary)
                    }

                    Text("最終更新: \(formattedDate(latest.updatedAtDate))")
                        .font(.caption2)
                        .foregroundColor(SystemStatusColor.secondary)
                }
            }

            // 管理系ボタン＋トグル
            VStack(spacing: 6) {
                Toggle("自動起動", isOn: launchAtLoginBinding)
                    .font(.caption)
                    .foregroundColor(SystemStatusColor.primary)
                    .toggleStyle(.switch)

                HStack(spacing: 4) {
                    Button("再読み込み") { Task { await viewModel.refresh() } }
                        .font(.caption2)
                        .foregroundColor(SystemStatusColor.primary)
                    Button("テスト") { NotificationService.sendTest() }
                        .font(.caption2)
                        .foregroundColor(SystemStatusColor.primary)
                    Spacer()
                    Menu {
                        Button("ログアウト") { viewModel.logout() }
                        Divider()
                        Button("終了", action: { NSApp.terminate(nil) })
                            .foregroundColor(SystemStatusColor.error)
                    } label: {
                        Text("≡")
                            .font(.caption)
                            .foregroundColor(SystemStatusColor.primary)
                            .frame(width: 24)
                    }
                    .menuStyle(.borderlessButton)
                }
            }

        }
        .padding(12)
        .frame(width: 380, height: 580)
        .background(Color.white)
    }

    // CO2濃度の実測値と、区分・影響の説明を表示する（2026-08-20追加）。
    // 区分の色はCO2センサー本体のLED（緑/黄/赤）と合わせているが、白背景で読めるよう
    // 他の表示と同じくシステムカラーを暗くしたものを使う（黄はsystemOrange系のwarningで代用）。
    private func co2Section(co2: Int, level: LatestData.Co2Level?) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("CO2濃度").font(.caption).foregroundColor(SystemStatusColor.secondary)
                Text("\(co2) ppm")
                    .font(.callout)
                    .bold()
                    .foregroundColor(co2Color(level?.color))
                if let level {
                    Text(level.level)
                        .font(.caption2)
                        .bold()
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(co2Color(level.color))
                        .cornerRadius(4)
                }
            }
            if let level {
                Text(level.description)
                    .font(.caption2)
                    .foregroundColor(SystemStatusColor.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func co2Color(_ color: String?) -> Color {
        switch color {
        case "green": return SystemStatusColor.success
        case "yellow": return SystemStatusColor.warning
        case "red": return SystemStatusColor.error
        default: return SystemStatusColor.secondary
        }
    }

    // 室内外の実測値の列。comfortLevelを渡した場合のみ快適さバッジを表示する（2026-08-21追加、室内のみ）。
    private func readingColumn(title: String, reading: Double, humidity: Double, di: Double, ah: Double, comfortLevel: LatestData.ComfortLevel?) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 6) {
                Text(title).font(.caption).foregroundColor(SystemStatusColor.secondary)
                if let comfortLevel {
                    Text(comfortLevel.level)
                        .font(.caption2)
                        .bold()
                        .foregroundColor(.white)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background(co2Color(comfortLevel.color))
                        .cornerRadius(3)
                }
            }
            Text("\(reading, specifier: "%.1f")℃ / \(humidity, specifier: "%.0f")%")
                .font(.callout)
                .foregroundColor(SystemStatusColor.primary)
            Text("DI: \(di, specifier: "%.1f")").font(.caption2).foregroundColor(SystemStatusColor.secondary)
            Text("AH: \(ah, specifier: "%.1f") g/m³").font(.caption2).foregroundColor(SystemStatusColor.secondary)
        }
    }

    private func feedbackColor(_ status: String) -> Color {
        switch status {
        case "ok": return SystemStatusColor.success
        case "warning": return SystemStatusColor.warning
        default: return SystemStatusColor.secondary
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
