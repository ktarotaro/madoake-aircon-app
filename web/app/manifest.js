// iPhoneでWeb Pushを受け取るには「ホーム画面に追加したWebアプリ」である必要があり、
// そのためにdisplayがstandaloneのmanifestが必須（Apple WebKit公式ブログの要件）。
export default function manifest() {
  return {
    name: "窓開け／エアコン判断アプリ",
    short_name: "窓開けエアコン",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
