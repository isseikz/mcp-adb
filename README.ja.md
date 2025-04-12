# MCP-ADB

Android Debug Bridge (ADB) を仲介する Model Context Protocol (MCP) サーバーで、AI アシスタントが Android デバイスを操作できるようにします。

## 機能

- **スクショ撮影**: 接続された Android デバイスのスクリーンショットを撮影できる。コンテキスト消費量を削減するために、幅 640px に自動リサイズする。
- **キーイベント制御**: Android デバイスにキーイベント（ナビゲーション、戻る、ホームなど）を送信できる
- **複数デバイス対応**: 複数のデバイスが接続されている場合に、device ID を指定して操作できる
- **デバイス一覧**: 接続されているすべての Android デバイスをリソースとして一覧表示

## 前提条件

- [Node.js](https://nodejs.org/)（v16 以上を推奨）
- [Android Debug Bridge (ADB)](https://developer.android.com/studio/command-line/adb) が PATH に設定されているか、ADB_PATH 環境変数で設定されていること
- USB デバッグが有効になっている接続済みの Android デバイス

## インストール

```bash
# リポジトリをクローン
git clone https://github.com/isseikz/mcp-adb.git
cd mcp-adb

# 依存関係をインストール
npm install

# プロジェクトをビルド
npm run build
```

## 使い方

### MCP サーバーの起動

```bash
node build/index.js
```

または、カスタム ADB パスを指定する場合:

```bash
ADB_PATH=/path/to/adb node build/index.js
```

グローバルにインストールした場合:

```bash
mcp-adb
```

#### Claude Desktop での使用方法

この MCP サーバーを Claude Desktop で使用するには:

1. ターミナルでサーバーを起動します:

   ```bash
   node build/index.js
   ```

2. Claude Desktop で設定アイコン（⚙️）をクリック
3. 「実験的機能」に移動
4. 「Model Context Protocol」を有効にする
5. 以下のコマンドで新しい MCP サーバーを追加:
   ```
   node /Users/isseikz/Projects/mcp-adb/build/index.js
   ```
6. これで、スクリーンショットの撮影やキー操作のリクエストを通じて、Claude から Android デバイスを操作できるようになります

### 利用可能なツール

#### スクリーンショットツール

接続された Android デバイスのスクリーンショットを撮影し、自動的に幅 640px にリサイズします。

パラメータ:

- `deviceId`（オプション）: 複数のデバイスが接続されている場合に特定のデバイスを対象にします

レスポンス:

- Base64 エンコードされた画像データ（PNG 形式）がレスポンスに直接含まれます

例:

```json
{
  "name": "screenshot",
  "arguments": {
    "deviceId": "emulator-5554"
  }
}
```

#### キー押下ツール

接続された Android デバイスにキーイベントを送信します。

パラメータ:

- `keycode`: 送信する Android キーコード（以下のリストを参照）
- `deviceId`（オプション）: 複数のデバイスが接続されている場合に特定のデバイスを対象にします

利用可能なキーコード:

- `KEYCODE_DPAD_CENTER` - センター/OK ボタン
- `KEYCODE_DPAD_DOWN` - 下方向ナビゲーション
- `KEYCODE_DPAD_UP` - 上方向ナビゲーション
- `KEYCODE_DPAD_LEFT` - 左方向ナビゲーション
- `KEYCODE_DPAD_RIGHT` - 右方向ナビゲーション
- `KEYCODE_DPAD_UP_LEFT` - 左上斜め方向
- `KEYCODE_DPAD_UP_RIGHT` - 右上斜め方向
- `KEYCODE_DPAD_DOWN_LEFT` - 左下斜め方向
- `KEYCODE_DPAD_DOWN_RIGHT` - 右下斜め方向
- `KEYCODE_BACK` - 戻るボタン
- `KEYCODE_HOME` - ホームボタン

例:

```json
{
  "name": "pressKey",
  "arguments": {
    "keycode": "KEYCODE_DPAD_DOWN",
    "deviceId": "emulator-5554"
  }
}
```

### リソース

#### 接続されたデバイス

接続されているすべての Android デバイスを一覧表示:

```
adb://devices
```

レスポンス:

- 接続されているデバイス ID のリスト

#### スクリーンショット

ファイル名を指定して特定のスクリーンショットにアクセス:

```
adb://screenshots/{filename}
```

例:

```
adb://screenshots/screenshot-2025-04-10T16-30-48-931Z.png
```

## 開発

### プロジェクト構造

```
mcp-adb/
├── src/
│   └── index.ts    # メインサーバー実装
├── build/          # コンパイルされたJavaScriptファイル
├── temp/           # スクリーンショット用一時ディレクトリ
├── package.json    # プロジェクト依存関係とスクリプト
└── tsconfig.json   # TypeScript設定
```

### ビルド

```bash
npm run build
```

これにより、TypeScript コードが`build`ディレクトリ内の JavaScript にコンパイルされます。

## 要件

このプロジェクトは以下の依存関係を使用しています:

- `@modelcontextprotocol/sdk`: MCP サーバー実装
- `fs-extra`: 拡張ファイルシステムメソッド
- `sips`: 画像のリサイズに使用（macOS に組み込み）- コンテキスト消費量を削減するため

## ライセンス

MIT

## 貢献

お気軽にプルリクエストを提出してください。
