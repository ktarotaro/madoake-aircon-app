import Foundation

struct LatestData: Codable {
    let updatedAt: String
    let indoor: Reading
    let outdoor: OutdoorReading
    let judgment: String
    let reason: String
    let recommendedTemperature: Double?
    let recommendedFanSpeed: String?
    let humidityNote: String?
    let co2Note: String?
    let indoorDI: Double
    let outdoorDI: Double
    let indoorAH: Double
    let outdoorAH: Double
    let acFeedback: AcFeedback?
    let overcoolingWarning: String?
    let co2Level: Co2Level?
    let comfortLevel: ComfortLevel?

    struct Reading: Codable {
        let temperature: Double
        let humidity: Double
        let co2: Int?
    }

    // CO2濃度の区分（CO2センサー付属マニュアルの基準表に準拠、2026-08-20追加）
    struct Co2Level: Codable {
        let level: String
        let color: String
        let description: String
    }

    // 室内の快適さの区分（2026-08-21追加。既存のdecide()の判定境界（DI>70・18℃未満）と一致させている）
    struct ComfortLevel: Codable {
        let level: String
        let color: String
        let description: String
    }

    struct OutdoorReading: Codable {
        let temperature: Double
        let humidity: Double
        let observedAt: String
    }

    struct AcFeedback: Codable {
        let status: String
        let message: String
    }

    var updatedAtDate: Date? {
        ISO8601DateFormatter().date(from: updatedAt)
    }

    // 冷房・除湿判定のみエアコン実行ボタンの対象（バックエンド・フロントエンドと同じ安全設定）
    var isAcExecutable: Bool {
        judgment == "エアコン（冷房）" || judgment == "エアコン（除湿）"
    }

    var modeLabel: String? {
        switch judgment {
        case "エアコン（冷房）": return "冷房"
        case "エアコン（除湿）": return "除湿"
        default: return nil
        }
    }
}
