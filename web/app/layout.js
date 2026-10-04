export const metadata = {
  title: "窓開け／エアコン判断アプリ",
  description: "室内外の温湿度データから窓開け／エアコンを自動判断する自分専用アプリ",
  icons: { apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "窓開けエアコン", statusBarStyle: "default" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
