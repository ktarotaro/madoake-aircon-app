// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "MadoakeAircon",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "MadoakeAircon",
            path: "Sources/MadoakeAircon"
        )
    ]
)
