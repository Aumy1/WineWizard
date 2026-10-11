# 🍷 WineWizard

A tiny, self-contained ML project: a **Random Forest** classifier that predicts
which of three cultivars a wine comes from, based on 13 chemical measurements
(alcohol, malic acid, magnesium, color intensity, etc.).

It uses the classic UCI Wine dataset, which is bundled with scikit-learn, so
there's nothing to download — just install and run.

## Live demo

[Open WineWizard](https://aumy1.github.io/WineWizard/)

The website is published automatically from `web/` when changes reach `main`.

## Setup

```bash
pip install -r requirements.txt
```

## Train

```bash
python train.py
```

This will:
- Train a `RandomForestClassifier` on an 80/20 train/test split
- Print accuracy and a classification report
- Save the trained model to `wine_model.joblib`
- Save a feature-importance bar chart to `feature_importance.png`

## Predict

```bash
# Demo sample
python predict.py

# Your own sample (13 values, same order as the dataset's features)
python predict.py 13.2 1.78 2.14 11.2 100 2.65 2.76 0.26 1.28 4.38 1.05 3.4 1050
```

## Project structure

```
winewizard/
├── train.py              # trains and saves the model + chart
├── predict.py            # loads the model and predicts on a sample
├── requirements.txt
├── .gitignore
└── README.md
```

## Ideas to extend it

- Swap in `GradientBoostingClassifier` or `XGBoost` and compare accuracy
- Add a `Flask`/`FastAPI` endpoint so predictions can be requested over HTTP
- Add cross-validation and hyperparameter tuning (`GridSearchCV`)
- Build a small Streamlit UI with sliders for each chemical feature

## License

MIT — do whatever you'd like with it.

## Visual interface

WineWizard helps you explore wine styles matching your tastes, understand a store bottle from its label, and experiment with wine chemistry. The browser interface in `web/` has two modes:

- **Taste finder:** filter a small sourced guide by colour, body, and character. Suggestions are general styles, not verified bottle matches or local stock listings.
- **Bottle guide:** enter label details for sourced general context. Price and volume calculate cost per 100 mL; ABV and volume calculate pure alcohol volume. Missing label details remain unknown. This does not identify a bottle, infer its chemical measurements, or rate quality.
- **Chemistry lab:** enter all 13 compatible chemical measurements or use the demo. It uses the actual trained
200-tree Random Forest, with editable inputs for all 13 measurements, demo reset,
class probabilities, and a chart of the five most important features. A separate experimental missing-value tool uses the median of 10 nearby training samples to estimate blank chemical inputs. Entered values are preserved; guessed values are labelled Estimated. Neighbour ranges are not confidence intervals, and estimates are not automatically passed to the classifier.

Start it from the project directory:

```bash
python -m http.server 8000 --directory web
```

Open **http://localhost:8000** and choose **Bottle guide** or **Chemistry lab**. The included
`web/model.json` is ready to use; Python ML dependencies are only needed to
retrain the model. Predictions run locally in your browser.

If you retrain, refresh the browser model:

```bash
python train.py
python export_web_model.py
python export_estimator.py
```

Inputs must be finite, nonnegative numbers. Values outside the original dataset
ranges show a caution. Class 0, 1, and 2 are dataset labels, not commercial wine
names or quality ratings. Probabilities are model estimates, not guarantees.
The browser predictor was checked against Python on all 178 dataset samples.

For static hosting, publish the contents of `web/` (for example with GitHub Pages).

### Interface assets

The pointer and text-cursor SVGs in `web/assets/` are from the user-supplied
Apple macOS 27 UI kit asset archive. Other interface visuals are built with CSS.

### Experimental estimate validation

The estimate reference contains only the 142 training rows from the same stratified split. On 36 held-out rows, mean absolute error scaled by training standard deviation was 0.765 with only alcohol observed (median baseline 0.846), and 0.649 with alcohol, malic acid and color intensity observed (baseline 0.860). These two fixed masking patterns are limited checks; they do not establish accuracy for arbitrary inputs or commercial bottles. Missing chemistry cannot be determined from label details.
