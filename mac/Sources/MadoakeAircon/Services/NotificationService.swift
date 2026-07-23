import Foundation
import UserNotifications

enum NotificationService {
    static func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
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
