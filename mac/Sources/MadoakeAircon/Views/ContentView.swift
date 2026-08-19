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
                    .padding(24)
                    .frame(width: 320)
                    .background(Color.white)
            } else {
                VStack(spacing: 8) {
                    Text(viewModel.errorMessage ?? "データがありません")
                        .font(.caption)
                    Button("再読み込み") { Task { await viewModel.refresh() } }
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
        VStack(alignment: .leading, spacing: 10) {
            // ヘッダー（判定結果）
            VStack(alignment: .leading, spacing: 2) {
                Text("窓開け／エアコン判断アプリ")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(latest.judgment)
                    .font(.system(size: 24, weight: .bold))
            }

            // 中央の動的コンテンツ（スクロール可能）
            ScrollView {
                VStack(alignment: .leading, spacing: 6) {
                    Text(latest.reason)
                        .font(.callout)
                        .foregroundColor(.secondary)

                    if let temp = latest.recommendedTemperature {
                        Text("推奨温度: \(temp, specifier: "%.1f")℃")
                            .font(.callout)
                            .bold()
                    }

                    if let fanSpeed = latest.recommendedFanSpeed {
                        Text("推奨風量: \(fanSpeed)")
                            .font(.callout)
                            .bold()
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
                        readingColumn(title: "室内", reading: latest.indoor.temperature, humidity: latest.indoor.humidity, di: latest.indoorDI, ah: latest.indoorAH)
                        readingColumn(title: "屋外", reading: latest.outdoor.temperature, humidity: latest.outdoor.humidity, di: latest.outdoorDI, ah: latest.outdoorAH)
                    }

                    Divider()

                    VStack(alignment: .leading, spacing: 2) {
                        Text("指標の説明").font(.caption2).bold()
                        Text("DI：≤60 快適 / 60-70 やや暑い / >70 不快")
                            .font(.caption2).foregroundColor(.secondary)
                    }

                    Text("最終更新: \(formattedDate(latest.updatedAtDate))")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            // 管理系ボタン＋トグル
            VStack(spacing: 6) {
                Toggle("自動起動", isOn: launchAtLoginBinding)
                    .font(.caption)
                    .toggleStyle(.switch)

                HStack(spacing: 4) {
                    Button("再読み込み") { Task { await viewModel.refresh() } }
                        .font(.caption2)
                    Button("テスト") { NotificationService.sendTest() }
                        .font(.caption2)
                    Spacer()
                    Menu {
                        Button("ログアウト") { viewModel.logout() }
                        Divider()
                        Button("終了", action: { NSApp.terminate(nil) })
                            .foregroundColor(SystemStatusColor.error)
                    } label: {
                        Text("≡")
                            .font(.caption)
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

    private func readingColumn(title: String, reading: Double, humidity: Double, di: Double, ah: Double) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.caption).foregroundColor(.secondary)
            Text("\(reading, specifier: "%.1f")℃ / \(humidity, specifier: "%.0f")%")
                .font(.callout)
            Text("DI: \(di, specifier: "%.1f")").font(.caption2).foregroundColor(.secondary)
            Text("AH: \(ah, specifier: "%.1f") g/m³").font(.caption2).foregroundColor(.secondary)
        }
    }

    private func feedbackColor(_ status: String) -> Color {
        switch status {
        case "ok": return SystemStatusColor.success
        case "warning": return SystemStatusColor.warning
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
