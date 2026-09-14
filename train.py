"""
WineWizard - train a Random Forest to predict wine cultivar from chemistry.

Uses the classic UCI Wine dataset, which ships built into scikit-learn,
so no external download is required.
"""

import joblib
import matplotlib.pyplot as plt
import numpy as np
from sklearn.datasets import load_wine
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

MODEL_PATH = "wine_model.joblib"
CHART_PATH = "feature_importance.png"


def main():
    data = load_wine()
    X, y = data.data, data.target

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(n_estimators=200, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)

    print(f"Test accuracy: {acc:.2%}\n")
    print(classification_report(y_test, preds, target_names=data.target_names))

    joblib.dump(
        {
            "model": model,
            "feature_names": data.feature_names,
            "target_names": data.target_names,
        },
        MODEL_PATH,
    )
    print(f"Saved trained model to {MODEL_PATH}")

    importances = model.feature_importances_
    order = np.argsort(importances)[::-1]

    plt.figure(figsize=(9, 5))
    plt.bar(range(len(importances)), importances[order])
    plt.xticks(
        range(len(importances)),
        [data.feature_names[i] for i in order],
        rotation=60,
        ha="right",
    )
    plt.ylabel("Importance")
    plt.title("Feature importance - Wine cultivar classifier")
    plt.tight_layout()
    plt.savefig(CHART_PATH, dpi=150)
    print(f"Saved feature importance chart to {CHART_PATH}")


if __name__ == "__main__":
    main()
