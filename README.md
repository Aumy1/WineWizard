# WineWizard

[Open the live website](https://aumy1.github.io/WineWizard/)

WineWizard combines a React wine style guide, a label explainer, a sourced question chatbot, a saved-bottle notebook, and an educational Python wine classifier.

## What is available

- **Taste guide:** filters six sourced wine styles by colour, body and character. It does not identify bottle flavours or check local stock.
- **Bottle guide:** explains your label entries and calculates price per 100 mL and pure alcohol volume.
- **Ask WineWizard:** a deterministic reference chatbot with source links. It answers common wine, label, calculation and project questions. It is not an LLM and does not fabricate bottle-specific details.
- **Notebook:** saves, opens and removes bottles. The public GitHub Pages version saves in your browser; the Node backend stores records in a SQL database.
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

## Consumer app design

See [architecture and screen flows](docs/product-architecture.md) for the planned React Native app, onboarding quiz, personalized match score, OCR scanner, retailer inventory and private intake journal. These future features are not represented as live capabilities.

[Shared taste-matching and intake logic examples](examples/product-logic.mjs) include descriptor coverage, Canadian standard drinks, timezone-aware weekly totals and missing-input handling. The tests cover representative cases; real recommendation calibration and retailer/OCR integration need separate evaluation.

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

Tests cover model parity, estimates, calculations, chatbot answers, SQL persistence, notebook isolation, input validation, authentication rejection, origin checks and the shared product logic.

Pointer/text-cursor SVG assets came from the user-supplied macOS UI kit. Other visuals are built in CSS.
