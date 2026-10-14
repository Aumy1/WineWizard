# WineWizard

[Open the live website](https://aumy1.github.io/WineWizard/)

WineWizard is a React wine education app with a taste quiz, explainable style matching, personal bottle notes and ratings, a browser label scanner, an intake journal, a sourced reference chatbot, and an optional educational chemistry lab.

## What is available

- **Taste quiz and matching:** colour, body, sweetness, acidity, tannin and aroma preferences match ten sourced educational style profiles. Ratings gradually influence recommendations. Percentages express heuristic similarity, not a probability of liking a commercial bottle; sparse profiles show no percentage.
- **Personal notebook:** save bottles, tasting descriptors, ratings and notes locally in your browser. The consumer notebook and intake journal do not sync across devices.
- **Label scanner:** select a camera/gallery image or paste label text. Tesseract.js recognizes text in a browser worker; review and correct fields before using them. Images stay in the browser, while OCR engine/language files load from jsDelivr. Price remains manual.
- **Bottle guide:** explains your label entries and calculates price per 100 mL and pure alcohol volume. Retailer links open official resources; WineWizard does not check real-time store inventory.
- **Intake journal:** manually record serving volume, ABV and time, edit/remove entries, and view weekly Canadian standard-drink totals. Missing ABV stays unknown. Optional hydration reminders run every 30 minutes while the page is open.
- **Ask WineWizard:** the public site uses a deterministic reference library with clickable sources. Questions about obscure grapes, appellation laws or specific vintages are flagged for live verification. It does not perform live searches without a separately configured backend.
- **Chemistry lab:** the exported 200-tree Random Forest runs in the browser. A separate nearest-neighbour tool fills missing chemistry with clearly labelled experimental estimates; estimates are not sent automatically to the classifier.

The website uses React, JavaScript and CSS. Python scripts use scikit-learn, NumPy, joblib and matplotlib. The server uses Node.js and SQLite. Firebase sign-in and Supabase PostgreSQL storage adapters are included, but require your own configured projects and a hosted backend before cloud functionality can be verified.

## Run

Requires Node.js 24 and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm start
```

Open http://127.0.0.1:8787. This runs the full frontend and SQLite API. SQLite data is stored in the ignored `data/` directory. The app isolates notebooks by an opaque browser-session cookie in local mode; do not treat this demo session mode as an account system.

For frontend development, run `pnpm dev` in another terminal while the backend is running. Vite proxies `/api` to the backend. A production static build with no API configured uses browser storage and local reference answers. Local storage and session-cookie data do not sync across devices.

## Cloud integration

Copy `.env.example` to `.env` and configure only the services you want. Keep service-role credentials exclusively on the server; they must never use a `VITE_` prefix or be committed.

For Firebase + Supabase:

1. Enable Google sign-in in your own Firebase project; add the deployed web domain to authorized domains.
2. Set the four public `VITE_FIREBASE_*` fields and matching server `FIREBASE_PROJECT_ID`.
3. Run `database/supabase.sql` in your own Supabase project. Row level security is enabled with no browser access policies; only the server service role accesses this table.
4. Set server `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
5. Host the Node server with HTTPS. Set its exact allowed client origins and set `VITE_API_URL` to its base URL before building the frontend.

The backend verifies Firebase token signatures, issuer, audience and expiry and applies owner filters on every database operation. The Supabase adapter and authentication error paths are tested with substitutes; an actual cloud connection is still required for end-to-end verification. The public Pages deployment deliberately has no server secrets or unconfigured sign-in buttons.

## Optional online assistant

The Node backend can use the OpenAI Responses API with web search when both server-only `OPENAI_API_KEY` and `OPENAI_MODEL` are configured. Select a model that supports the web-search tool, host the backend, and set the frontend API URL. Keys never belong in browser variables or this repository. Without those settings, the reference library continues to work.

Questions requiring fresh verification require a search from the configured adapter. Responses display clickable citations; a response is labelled as searched only when the API reports a completed search and citations. Requests exclude the private intake journal, use timeouts/rate limits, and are not stored by WineWizard. This adapter is tested with mocked API responses; no live API account is configured or verified for the public deployment. Store-stock questions remain reference-only.

## Consumer app architecture

See [architecture and screen flows](docs/product-architecture.md) for the web/mobile design and future cloud catalog, licensed retailer feeds and React Native app. The current web quiz, matching, editable OCR, notebook and intake screens are implemented. Catalog profiles describe generic styles; they are not exact bottle records or store inventory.

[Shared taste-matching and intake logic](examples/product-logic.mjs) includes descriptor coverage, Canadian standard drinks, timezone-aware weekly totals and missing-input handling. Real recommendation calibration, licensed inventory feeds, mobile clients and cloud synchronization remain future work.

## Python model

```sh
pip install -r requirements.txt
python train.py
python export_web_model.py
python export_estimator.py
```

The UCI Wine dataset has 178 samples, 13 measurements and three class labels. A stratified 80/20 split achieved 36/36 correct classifications on one held-out split. This does not establish accuracy on store wines. The React predictor is tested against Python probabilities on all 178 rows.

The missing-value reference contains the 142 training rows. With only alcohol observed, held-out scaled mean absolute error was 0.765 (median baseline 0.846); with alcohol, malic acid and color intensity observed, error was 0.649 (baseline 0.860). These two fixed masking patterns do not validate commercial bottle chemistry. Neighbour ranges are not confidence intervals.

## Deployment and checks

GitHub Actions installs dependencies, runs the tests, builds React and publishes `dist/` to GitHub Pages. The Node backend must be hosted separately for remote database features; Pages runs the frontend.

Tests cover model parity, estimates, calculations, chatbot answers, SQL persistence, notebook isolation, input validation, authentication rejection, origin checks shared product logic, conservative OCR parsing and online-assistant routing with mocked responses.

Pointer/text-cursor SVG assets came from the user-supplied macOS UI kit. Other visuals are built in CSS.
