# 🍷 WineWizard

A tiny, self-contained ML project: a **Random Forest** classifier that predicts
which of three cultivars a wine comes from, based on 13 chemical measurements
(alcohol, malic acid, magnesium, color intensity, etc.).

It uses the classic UCI Wine dataset, which is bundled with scikit-learn, so
there's nothing to download — just install and run.

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
