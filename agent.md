# Clockworker web manual handoff

このディレクトリは Clockworker の公開用 Web マニュアルです。本文を主役にした日本語ドキュメントで、最初の「各部の名称と基本操作」章だけがスクロール連動パネルを持ちます。

## 構成

- `index.html`
  - 文書構造は H1（製品名）→ H2（章）→ H3（項目）。装飾用の eyebrow は使用しない。
  - `.guided-section` のみが、パネルと説明本文を横並びにする。`manual-step` の `data-scene` と `data-focus` が表示内容と SVG のフォーカスを決める。
- `style.css`
  - ページ全体が通常スクロールする。`.guided-panel-wrap` はガイド章の範囲だけ `sticky` になり、章末では本文と一緒に上へ流れる。
  - OLED とロータリーの説明は `.control-grid` の2カラム。モバイルでは1カラムになる。
- `app.js`
  - OLED 描画、パネル SVG 読み込み、ウィンドウスクロールへのフォーカス同期を担当する。
  - ロータリー項目を読んでいる間は、緑色 LED、ポインター、BPM 表示をアニメーションする。
- `panel.svg`
  - 各部品は `data-name` で識別する。SVG 自体は拡大・パンせず、必要な部品だけを明るく表示する。
- `icons/`
  - OLED 表示に使う PNG 素材。公開物に含めること。`app.js` から `icons/<name>.png` として読む。

## 確認

```sh
node --check app.js
git diff --check
python3 -m http.server 8090
```

確認ポイント:

- H1 / H2 / H3 の順序が崩れていない。
- ガイド章ではパネルが追従し、次の H2 で追従を解除する。
- ロータリー項目で緑LED点滅、回転、OLEDのBPM更新が同期する。
- モバイル幅で横スクロールが発生しない。
