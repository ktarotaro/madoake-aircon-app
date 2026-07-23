import SwiftUI

struct LoginView: View {
    @EnvironmentObject var viewModel: AppViewModel
    @State private var password: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("窓開け／エアコン判断アプリ")
                .font(.headline)

            SecureField("パスワード", text: $password)
                .textFieldStyle(.roundedBorder)
                .onSubmit { submit() }

            Button("ログイン") { submit() }
                .disabled(password.isEmpty || viewModel.isLoading)

            if let error = viewModel.errorMessage {
                Text(error)
                    .foregroundColor(SystemStatusColor.error)
                    .font(.caption)
            }
        }
        .padding(16)
        .frame(width: 280)
        .background(Color.white)
    }

    private func submit() {
        guard !password.isEmpty else { return }
        Task { await viewModel.login(password: password) }
    }
}
