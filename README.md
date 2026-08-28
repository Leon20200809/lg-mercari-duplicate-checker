# LG Mercari Duplicate Checker

メルカリの検索結果に表示されている商品をGoogleスプレッドシートの登録済みURLと照合し、重複商品を検索画面上で視覚的に判別できるChrome拡張機能です。

## 目的

商品リサーチ時に発生していた、

1. メルカリで商品を確認する
2. Googleスプレッドシートを開く
3. 過去に登録済みの商品か確認する
4. メルカリへ戻る

という反復作業を削減します。

登録済みの商品は検索結果の商品画像を暗くし、画像中央に **「重複！」** と表示します。

## 主な機能

- メルカリ検索結果ページを自動判定
- 検索結果DOMから商品情報を取得
- 動的に追加される商品を `MutationObserver` で監視
- Google OAuthによるユーザー認証
- Google Sheets APIによる登録済みURLの読み取り
- 商品URLからメルカリ商品IDを抽出
- `Set` を利用した重複判定
- 重複商品の画像へオーバーレイ表示
- スプレッドシートURL / IDとシート名を設定画面から変更可能
- 設定値を `chrome.storage.sync` に保存

## 処理フロー

```text
メルカリ検索結果
        ↓
content.js
DOMから商品IDを取得
        ↓
background.js
        ↓
Google OAuth
        ↓
Google Sheets API
        ↓
登録済み商品IDを取得
        ↓
Set化
        ↓
DOMの商品IDと照合
        ↓
重複商品へ「重複！」を表示
```

## 構成

```text
lg-mercari-duplicate-checker/
├── manifest.json
├── README.md
└── src/
    ├── background.js
    ├── content.js
    ├── content.css
    ├── services/
    │   ├── sheets.js
    │   └── storage.js
    └── options/
        ├── options.html
        ├── options.js
        └── options.css
```

### ファイル責務

| ファイル              | 責務                                            |
| --------------------- | ----------------------------------------------- |
| `manifest.json`       | Chrome拡張の構成・権限・OAuth設定               |
| `content.js`          | メルカリDOMの監視・商品取得・重複判定・画面反映 |
| `content.css`         | 重複商品の視覚表示                              |
| `background.js`       | content scriptとGoogle Sheets間の橋渡し         |
| `services/sheets.js`  | Google認証・Sheets API・商品ID変換              |
| `services/storage.js` | 拡張設定の保存・取得                            |
| `options/options.js`  | 設定画面のUI制御                                |

## Google Sheets

現在のMVPでは、商品URL列を以下に固定しています。

```text
F8:F
```

スプレッドシートとシート名は拡張機能の設定画面から変更できます。

対象URL例：

```text
https://jp.mercari.com/item/m12345678901
```

URL全文ではなく、以下の商品IDを抽出して重複判定します。

```text
m12345678901
```

## 技術

- Chrome Extensions Manifest V3
- Vanilla JavaScript
- Chrome Identity API
- Chrome Storage API
- Google OAuth 2.0
- Google Sheets API
- MutationObserver

## 設計方針

### DOMは意味のある属性を優先する

生成されたCSS classには依存せず、主に以下を利用します。

```text
li[data-testid="item-cell"]
a[data-testid="thumbnail-link"]
[data-testid="thumbnail-item-name"]
```

### 固定時間待ちに依存しない

メルカリの商品はJavaScriptによって動的に描画されるため、固定の `setTimeout` で描画時間を推測せず、`MutationObserver` でDOM変更を検知します。

### Sheets APIを無駄に呼ばない

登録済み商品IDはページ開始時に取得して `Set` として保持し、DOMが追加されるたびにSheets APIを再実行しません。

## MVPの範囲

現在は以下をMVPとしています。

- Google Sheets読み取り
- メルカリ通常商品の重複判定
- 検索結果への重複表示
- スプレッドシート設定の保存

今後必要になった場合にのみ、URL列の可変化、ショップ商品の対応、UI改善などを追加します。
