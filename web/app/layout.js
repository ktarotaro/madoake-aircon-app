export const metadata = {
  title: "窓開け／エアコン判断アプリ",
  description: "室内外の温湿度データから窓開け／エアコンを自動判断する自分専用アプリ",
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
