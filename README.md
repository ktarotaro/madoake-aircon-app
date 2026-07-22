# 窓開け／エアコン判断アプリ

室内外の温湿度・降水データから「窓を開ける／エアコン／どちらでもいい」を自動判断するアプリ。判断ロジック・アルゴリズム設計を主眼にしたポートフォリオ／自分専用ツール。

## 仕組み

```
SwitchBot 温湿度計（室内）──┐
                            ├─ GitHub Actions（10分おき）─ data/latest.json
気象庁アメダス（屋外・札幌）──┘
```

GitHub Actionsが10分おきに室内外のデータを取得し、[判断ロジック](src/logic.js)で「窓を開ける／エアコン／どちらでもいい」を計算、結果を [`data/latest.json`](data/latest.json) に保存します。

## 判断ロジック

1. 降水あり → 「エアコン」
2. 室内の不快指数（DI）が快適域（〜70）→ 「どちらでもいい」
3. 不快指数が70超の場合、屋外の方が涼しく（気温）、かつ湿気も同等以下（絶対湿度）なら → 「窓を開ける」。そうでなければ → 「エアコン」

詳細な計算式は [`src/logic.js`](src/logic.js) を参照。

## 開発

```bash
npm run list-devices  # SwitchBotのデバイスID一覧を取得
npm run poll           # 判断を1回実行
```

`.env.example` を `.env` にコピーし、`SWITCHBOT_TOKEN` / `SWITCHBOT_SECRET` を設定してください（[SwitchBot API](https://github.com/OpenWonderLabs/SwitchBotAPI) のトークン・シークレット）。
