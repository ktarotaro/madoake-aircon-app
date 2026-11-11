import Foundation

// 翌日の暖房の段取り（data/heating-plan.json、2026-11-11追加）。
// 判定はサーバー側（web/lib/heatingPlan.js）だけで行う。Macアプリは通知文と期限を読むだけで、判定ルールを持たない。
struct HeatingPlan: Codable {
    let id: String
    let targetDate: String
    let createdAt: String
    let notifyUntil: String
    let test: Bool
    let title: String
    let body: String
}
