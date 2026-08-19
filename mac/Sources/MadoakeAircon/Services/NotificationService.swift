import Foundation
import UserNotifications
import AppKit

enum NotificationService {
    static func sendTest() {
        send(title: "テスト通知", body: "これはテスト通知です。届いていれば通知設定は正常です。")
    }

    // LSUIElement（Dockアイコンなし）アプリはバックグラウンド状態のままだと
    // システムが通知許可の同意ダイアログ・通知設定一覧への登録を正しく行わないことがあるため、
    // リクエスト中だけ一時的に通常アプリ扱いにして前面化する（2026-08-03、通知が届かない不具合の対策）。
    static func requestAuthorization() {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in
            DispatchQueue.main.async {
                NSApp.setActivationPolicy(.accessory)
            }
        }
    }

    static func notifyJudgmentChanged(from previous: String?, to current: LatestData) {
        guard let previous, previous != current.judgment else { return }
        send(title: "判定が変わりました: \(current.judgment)", body: current.reason)
    }

    // 乾燥注意（humidityNote）の有無が変わったときに通知する（判定＝judgmentとは独立した項目のため別枠で監視）
    static func notifyHumidityNoteChanged(from previous: String?, to current: LatestData) {
        guard previous != current.humidityNote else { return }

        if let note = current.humidityNote {
            send(title: "乾燥注意", body: note)
        } else if previous != nil {
            send(title: "乾燥注意は解消しました", body: "室内の湿度が回復しました。")
        }
    }

    // CO2通知（co2Note）の有無が変わったときに通知する（2026-08-21、CO2センサー導入）
    static func notifyCo2NoteChanged(from previous: String?, to current: LatestData) {
        guard previous != current.co2Note else { return }

        if let note = current.co2Note {
            send(title: "換気推奨", body: note)
        } else if previous != nil {
            send(title: "換気推奨は解消しました", body: "室内のCO2濃度が正常に戻りました。")
        }
    }

    // 冷えすぎ警告（overcoolingWarning）が新たに出たときのみ通知する（解消時は通知しない。Web版と同じ非対称設計）
    static func notifyOvercoolingChanged(from previous: String?, to current: LatestData) {
        guard previous != current.overcoolingWarning, let warning = current.overcoolingWarning else { return }
        send(title: "冷えすぎ注意", body: warning)
    }

    private static func send(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request)
    }
}
