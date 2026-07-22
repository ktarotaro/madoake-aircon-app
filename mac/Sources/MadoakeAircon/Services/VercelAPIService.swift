import Foundation

enum VercelAPIError: LocalizedError {
    case invalidPassword
    case server(String)
    case network(Error)

    var errorDescription: String? {
        switch self {
        case .invalidPassword: return "パスワードが違います"
        case .server(let message): return message
        case .network(let error): return error.localizedDescription
        }
    }
}

final class VercelAPIService {
    static let shared = VercelAPIService()

    private let baseURL = URL(string: "https://madoake-aircon-app.vercel.app")!
    private let latestJSONURL = URL(
        string: "https://raw.githubusercontent.com/ktarotaro/madoake-aircon-app/main/data/latest.json"
    )!

    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.default
        config.httpCookieAcceptPolicy = .always
        config.httpShouldSetCookies = true
        return URLSession(configuration: config)
    }()

    private init() {}

    // ログイン済みか（Vercelのsession Cookieが有効な間はtrue）
    var hasSession: Bool {
        let cookies = HTTPCookieStorage.shared.cookies(for: baseURL) ?? []
        return cookies.contains { $0.name == "session" }
    }

    func login(password: String) async throws {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/login"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["password": password])

        let (_, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw VercelAPIError.server("不明なエラー")
        }
        guard http.statusCode == 200 else {
            throw VercelAPIError.invalidPassword
        }
    }

    func fetchLatest() async throws -> LatestData {
        var request = URLRequest(url: latestJSONURL)
        request.cachePolicy = .reloadIgnoringLocalCacheData

        let (data, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw VercelAPIError.server("データを取得できませんでした")
        }

        let decoder = JSONDecoder()
        return try decoder.decode(LatestData.self, from: data)
    }

    func applyAc(action: String) async throws {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/apply-ac"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["action": action])

        let (data, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw VercelAPIError.server("不明なエラー")
        }

        if http.statusCode == 401 {
            throw VercelAPIError.invalidPassword
        }

        guard http.statusCode == 200 else {
            let message = (try? JSONDecoder().decode([String: String].self, from: data))?["error"]
            throw VercelAPIError.server(message ?? "エアコン操作に失敗しました")
        }
    }
}
