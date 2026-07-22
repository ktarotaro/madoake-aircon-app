import Foundation
import Combine

@MainActor
final class AppViewModel: ObservableObject {
    @Published var latest: LatestData?
    @Published var isLoggedIn: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var actionResultMessage: String?

    private let api = VercelAPIService.shared
    private var refreshTimer: Timer?

    init() {
        if let savedPassword = KeychainHelper.loadPassword() {
            Task { await login(password: savedPassword, save: false) }
        }
        startAutoRefresh()
    }

    deinit {
        refreshTimer?.invalidate()
    }

    func startAutoRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 600, repeats: true) { [weak self] _ in
            Task { @MainActor in await self?.refresh() }
        }
    }

    func login(password: String, save: Bool = true) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            try await api.login(password: password)
            isLoggedIn = true
            if save {
                KeychainHelper.savePassword(password)
            }
            await refresh()
        } catch {
            isLoggedIn = false
            errorMessage = (error as? VercelAPIError)?.errorDescription ?? error.localizedDescription
        }
    }

    func logout() {
        KeychainHelper.deletePassword()
        isLoggedIn = false
        latest = nil
    }

    func refresh() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            latest = try await api.fetchLatest()
        } catch {
            errorMessage = (error as? VercelAPIError)?.errorDescription ?? error.localizedDescription
        }
    }

    func executeAc(action: String) async {
        isLoading = true
        errorMessage = nil
        actionResultMessage = nil
        defer { isLoading = false }

        do {
            try await api.applyAc(action: action)
            actionResultMessage = "送信しました。実際に反応しているか目視で確認してください。"
            await refresh()
        } catch {
            errorMessage = (error as? VercelAPIError)?.errorDescription ?? error.localizedDescription
        }
    }
}
