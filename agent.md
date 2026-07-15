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

## Scroll and hash behavior

- 本文スクロールは `.manual-copy` の内部スクロールです。
- 目次リンクや `#oled`, `#encoder` 直アクセスでは、該当 `manual-step` を有効化し、対応する `data-scene` / `data-focus` を即反映します。
- `scrollIntoView()` はページ全体のスクロールに吸われやすかったため、`manual-copy.scrollTo()` を使って手動計算しています。

## Cache busting

ローカル確認で古いJS/CSS/SVGを掴みやすいので、変更後は `index.html` のCSS/JSクエリと、`app.js` 内の `panel.svg?v=...` を同じ値へ更新してください。

現在値:

```text
20260715n
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

## Design direction

- ミニマル、フラット、Apple風。
- 黒背景/白文字のOLED表現。
- ユーザー操作用シミュレータではなく、マニュアル本文の進行に合わせてSVGが説明するドキュメント。
- まずは「各部名称」を完成させる。次に各章ごとに `manual-step` を増やして、`data-focus` と `data-scene` を割り当てる。
