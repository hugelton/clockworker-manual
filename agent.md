# Clockworker webmanual handoff

このリポジトリ直下が、Clockworker のWebマニュアル用プロトタイプです(`webmanual/` ディレクトリはありません、フラット構成)。Appleっぽいミニマルなページ構成で、上段に本体パネルSVG、下段にマニュアル本文を置き、本文の段落に応じてSVG側のフォーカス・OLED表示・ロータリーアニメーションを切り替えます。

## Files

- `index.html`
  - ヘッダー、ハンバーガー目次、パネル表示エリア、マニュアル本文。
  - `section.manual-step` の `data-scene` と `data-focus` が、OLED画面とSVGフォーカスを決めます。
  - canvas は `id="oled-canvas"`。`section id="oled"` と衝突させないこと。
- `style.css`
  - 画面を `header / panel-reader / manual-copy` の3段に分けています。
  - パネル領域と本文領域はオーバーレイ禁止。本文は `.manual-copy` の中だけでスクロールします。
- `app.js`
  - OLEDの128x32 canvas描画、SVG読み込み、スクロール同期、フォーカスカメラ、ロータリー回転アニメーションを担当。
  - OLED文字はアンチエイリアスを避けるため、オフスクリーンcanvasで描いて二値化してから128x32へ転写しています。
- `panel.svg`
  - 本体パネルSVG。`data-name` で各部品を識別します。
  - 主要な `data-name`: `oled`, `rotaryknob`, `playbutton`, `stopbutton`, `tapbutton`, `soucebutton`, `portsbutton`, `configbutton`, `inClock`, `inAction`, `outA`, `outB`, `outC`, `outD`, `midi-in`, `midi-out`, `USB`。
  - `<svg>` 自身に `width`/`height` 属性はなく `viewBox` のみ。`.panel-art svg { width:100%; height:auto; }` にすると、iOS Safariがviewboxからintrinsic比率を推測できず歪むことがあるため、`height:100%` にして親 `.panel-art`(`aspect-ratio` 指定済み)に委ねている。ここは変更しないこと。

## アイコン画像アセット (未コミット)

`app.js` の `drawImage()`/`images` は `../icons/${name}.png` から約40個のOLEDアイコン(`header_tempo`, `source_internal`, `port_1` など)を読み込みますが、`icons/` ディレクトリはまだリポジトリにコミットされていません(ユーザーが後日追加予定)。追加されるまで、これらのアイコンが必要な画面(HOME、SOURCE、PORT、CONFIG、SWING)は一部要素が欠けたまま表示されます。これはバグではなく既知の未完了タスクです。

## Current camera behavior

`app.js` の `focusOrigins` がカメラ位置を決めます。

- `overview`: 全体表示。
- `oled` と `rotary`: 個別部品に寄らず、OLEDとRotaryを含む下側操作ブロック全体へズームします。
  - 2026-07-15時点では、このブロックがパネル領域幅の約90%になるよう `panelScaleForFocus("fit-wide", blockWidth)` で倍率を計算しています。
  - OLEDページとRotaryページは同じカメラ位置で、ハイライトだけ切り替えます。
- その他の `transport`, `menu`, `clock`, `midi` はまだ暫定倍率です。

重要: ユーザーの意図は「本文段落に従って見せる」ことです。ユーザーがSVGを直接操作するUIは不要です。

## Focus割り当ての方針

マニュアル本文が `docs/manual.md`(Introduction〜FAQ、全14章相当)に増えたため、`data-focus` は次の方針で割り当てています。

- Safety、Specifications、Quick Start、Sync Compatibility、Performance、FAQなど「パネルの特定部位を見せる必要のない」段落は `overview` のまま(ズームインしない)。
- `oled` / `rotary` は、OLED画面の表示内容やエンコーダ操作そのものを説明している段落だけに絞る(例: `ui-home`, `ui-encoder`)。
- `clock` / `menu` / `transport` / `midi` は、対応するパネル部位に直接言及している段落にのみ割り当てる。
- 新しいfocus種別を追加する前に、既存の7種(`overview`, `oled`, `rotary`, `transport`, `menu`, `clock`, `midi`)で表現できないか検討すること。

この方針により、UI章やMenu構成の説明が続いても画面が `oled`/`rotary` に張り付いたままにならないようにしています。

## パネル表示/非表示 (data-panel)

`section.manual-step` に `data-panel="hidden"` を付けると、`.panel-reader` に `is-collapsed` クラスが付いて高さ0まで折りたたまれ、本文(`.manual-copy`)がその分フルサイズで表示されます(`activateStep()` 内で切り替え)。Safety、Specifications、Quick Start、Sync Compatibility、Performance、FAQなど「パネルを見せる必要がない」章に付与済みです。新しい章を足すときも、パネル部位に触れない段落にはこれを付けること。

重要: `.panel-reader` の `height` に transition を付けない。スクロール中に高さが変わるgrid行(`auto`トラック)をアニメーションさせると、スクロールと同時にレイアウト再計算が走ってガクつく。折りたたみは瞬時に切り替える(現状の実装のまま)。同様の理由で `.manual-step` 側の非アクティブ時フェードも廃止済み — スクロール中の常時アニメーションはこのページでは基本避けること。

パネル下の `#screen-name`(HOME/SOURCEなど)と `#panel-detail`(各部名称ラベル)は削除済み。復活させる場合は `app.js` 側の `render()` / `setScene()` / `applyLang()` に対応する行を戻す必要がある(現状は参照ごと削除してある)。

## 多言語対応 (EN/JA)

- ヘッダー右上の `#lang-button` で日本語/英語を切り替えます。状態は `localStorage("cw-lang")` に保存。
- 翻訳したい要素には日本語テキストをそのまま書いた上で `data-en="English text"` を追加するだけでよい。`app.js` の `applyLang()` が `[data-en]` を全走査し、初回に `data-ja` へ元テキストを退避してから言語に応じて `textContent` を差し替えます。入れ子のHTMLは使わず、必ずプレーンテキストの要素(`h2`, `p`, `li`, `a` など)に付けること。
- `eyebrow`(章ラベル、例: "Safety", "MIDI")と `toc-group` 見出しは元から英語表記なので翻訳不要。
- パネル下の部位名(`#panel-detail`)は `focusDetails` オブジェクト(`{ja, en}`)から `setScene()`/`applyLang()` が都度セットするので、HTML側の `data-en` は初期表示用のフォールバックに過ぎない。
- OLED上の `#screen-name`(HOME/SOURCE/PORT/CONFIG/SWINGなど)は実機表示に合わせて常に英語表記のままでよい(翻訳しない)。

## Scroll and hash behavior

- 本文スクロールは `.manual-copy` の内部スクロールです。
- 目次リンクや `#oled`, `#encoder` 直アクセスでは、該当 `manual-step` を有効化し、対応する `data-scene` / `data-focus` を即反映します。
- `scrollIntoView()` はページ全体のスクロールに吸われやすかったため、`manual-copy.scrollTo()` を使って手動計算しています。

## Cache busting

ローカル確認で古いJS/CSS/SVGを掴みやすいので、変更後は `index.html` のCSS/JSクエリと、`app.js` 内の `panel.svg?v=...` を同じ値へ更新してください。

現在値:

```text
20260715p
```

## Verification

最低限:

```sh
node --check app.js
git diff --check -- index.html app.js style.css panel.svg agent.md
```

ブラウザ確認:

- `http://localhost:8090/#front-panel`
- `http://localhost:8090/#oled`
- `http://localhost:8090/#encoder`
- 目次(ハンバーガーメニュー)を開き、全チャプターぶんのリンクが縦スクロールで見えて操作できること。

特に確認すること:

- パネル領域と本文領域が重ならない。
- OLED / Rotary ページでは、OLED〜Rotaryのブロック全体が画面幅寄りに見える。
- OLEDページとRotaryページでカメラ位置が大きく変わらず、ハイライトだけが変わる。
- ロータリーは自転する。公転して見える場合は `preparePanelSvg()` の `transformBox` / `transformOrigin` と、SVG側の対象グループを確認する。
- OLED文字がアンチエイリアスで滲まない。
- 375-430px程度の狭い画面幅でパネルSVGの縦横比が崩れない(iOS Safari実機 or レスポンシブモードで必ず確認)。
- Safety/Specifications/Quick Start/Sync Compatibility/Performance/FAQ章ではパネル領域が折りたたまれ、本文がフル表示になる。
- ヘッダーの `EN`/`JA` ボタンで表示言語が切り替わり、リロード後も維持される(localStorage)。
- OSの配色設定をダークにした状態でも、文字とパネル領域の配色が破綻しない。

## Design direction

- ミニマル、フラット、Apple風。
- 黒背景/白文字のOLED表現。
- ユーザー操作用シミュレータではなく、マニュアル本文の進行に合わせてSVGが説明するドキュメント。
- まずは「各部名称」を完成させる。次に各章ごとに `manual-step` を増やして、`data-focus` と `data-scene` を割り当てる。
