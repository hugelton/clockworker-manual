# Clockworker user manual handoff

This repository is the deployable, bilingual Clockworker user manual. The local manual is the source of truth; user-facing behavior must be verified against the Clockworker firmware sources before it is documented.

## Files

- `index.html`: Japanese source copy, complete English translations in `data-en`, table of contents, user instructions, and CSS/SVG diagrams.
- `style.css`: document layout, diagrams, responsive rules, and print styles.
- `app.js`: language switching, panel SVG loading, OLED rendering, section focus, and hash navigation.
- `panel.svg`: annotated front-panel artwork.
- `icons/`: OLED screen assets used by `app.js`.

## Documentation rules

- Write for a person using the product. Do not add GPIO, UART, Core 1, SIO, logic-analyzer, release-gate, or other developer/manufacturing information.
- Do not guess electrical limits, dimensions, compatibility, connector standards, or behavior that is not confirmed by the firmware or product sources.
- Keep Quick Start near the beginning, then explain controls, clock/MIDI behavior, configuration, firmware update, troubleshooting, and user-facing specifications.
- Keep Japanese and English equivalent. Every translatable visible element needs `data-en`; accessible labels use `data-en-aria` where required.
- `data-en` replaces `textContent`, so put it only on elements whose child markup does not need to survive a language change.
- Prefer small connection and signal diagrams next to procedures instead of decorative graphics.

## Interaction and layout

- The header language button stores the selection in `localStorage("cw-lang")`.
- `section.manual-step` values in `data-scene` and `data-focus` control the OLED scene and highlighted panel region.
- Hash links must work on first load as well as from the table of contents.
- On narrow screens the panel belongs in the document flow; it must not remain sticky over the instructions.
- Keep cache-busting values synchronized in `index.html` and the `panel.svg` URL in `app.js`. Current value: `20260716d`.

## Verification

Run:

```sh
node --check app.js
git diff --check
```

In a browser, check Japanese and English at desktop and mobile widths. Verify:

- no missing translations, duplicate IDs, broken internal links, image failures, or console errors;
- `#front-panel` and other table-of-contents links land below the fixed header;
- panel markers and OLED graphics load;
- the page has no horizontal overflow;
- the mobile panel does not cover the manual text.

Pushes to `main` deploy through GitHub Pages.
