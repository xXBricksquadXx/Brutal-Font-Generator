# ცՐυ੮คՆ Բ૦Ո੮ ૭૯Ո૯Րค੮૦Ր (**Vanilla JS**)

[![Vanilla JS](https://img.shields.io/badge/vanilla-js-f7df1e?logo=javascript&logoColor=000)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Deploy](https://img.shields.io/badge/deploy-vercel-000?logo=vercel&logoColor=fff)](https://brutal-font-generator.vercel.app/)
[![License](https://img.shields.io/badge/license-MIT-3da639)](#license)

Stripped + modular rebuild of a legacy single-page **font generator**.

Live: [https://brutal-font-generator.vercel.app/](https://brutal-font-generator.vercel.app/)

## What it does

- Browse **207 Unicode font styles** (search + favorites)
- Optionally apply a **decorator** (wrap/surround text with a pattern)
- **One-click copy** (with fallbacks for restricted environments)

## Run locally

### Option A

Open `index.html` in your browser.

Note: because this project uses ES modules (`<script type="module">`), some browsers will block module imports over `file://`. If you see a blank page or console errors about CORS/modules, use Option B.

### Option B (recommended)

From this folder run:

```bash
python -m http.server 5173
```

Then open:

- [http://localhost:5173](http://localhost:5173)

## Project layout

```
clean-font-generator/
  index.html        # layout + wiring
  styles.css        # minimal styling (no Tailwind)
  app.js            # rendering + copy + favorites
  fonts.js          # extracted font mappings (exports FONT_STYLES)
  decorators.js     # extracted decorators (exports DECORATORS)
```

## Customize

- Add/edit font mappings in `fonts.js` (`FONT_STYLES`)
- Add/edit patterns in `decorators.js` (`DECORATORS`)

Refresh the page to see changes.

## Notes

- Clipboard behavior varies by browser/security context.

  - Best results come from running via `http://localhost` (Option B).

## License

MIT
