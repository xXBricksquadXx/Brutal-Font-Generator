# Clean Font Generator (vanilla JS)

Stripped + modular rebuild of the legacy single-page font generator.

## Run

### Option A
Open `index.html` in your browser.

Note: because this project uses ES modules (`<script type="module">`), some browsers will block it over `file://`. If you see a blank page or console errors about CORS/modules, use Option B.

### Option B (recommended for best clipboard support)
From this folder run:

- `python -m http.server 5173`
- Open: `http://localhost:5173`

## Features

- 207 Unicode font styles (search + favorites)
- Optional decorator (surround text with a pattern)
- One-click copy (with fallback for file://)

## Files

- `index.html` – layout + wiring
- `styles.css` – minimal styling (no Tailwind)
- `fonts.js` – extracted font mappings
- `decorators.js` – extracted decorators
- `app.js` – rendering + copy + favorites
