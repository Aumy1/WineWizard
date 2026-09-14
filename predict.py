"""
Load the trained WineWizard model and predict the cultivar for a wine sample.

Usage:
    python predict.py <13 chemical measurements, space separated>

Example (13 values in the same order as sklearn's wine dataset features):
    python predict.py 13.2 1.78 2.14 11.2 100 2.65 2.76 0.26 1.28 4.38 1.05 3.4 1050

Run with no arguments to see a demo prediction instead.
"""

import sys

import joblib
import numpy as np

MODEL_PATH = "wine_model.joblib"


def main():
    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"]
    feature_names = bundle["feature_names"]
    target_names = bundle["target_names"]

    if len(sys.argv) == len(feature_names) + 1:
        sample = np.array([float(v) for v in sys.argv[1:]]).reshape(1, -1)
    else:
        print("No sample given - using a demo sample.\n")
        sample = np.array(
            [[13.2, 1.78, 2.14, 11.2, 100, 2.65, 2.76, 0.26, 1.28, 4.38, 1.05, 3.4, 1050]]
        )

    pred = model.predict(sample)[0]
    proba = model.predict_proba(sample)[0]

    print(f"Predicted cultivar: {target_names[pred]}\n")
    for name, p in zip(target_names, proba):
        print(f"  {name}: {p:.1%}")


if __name__ == "__main__":
    main()
