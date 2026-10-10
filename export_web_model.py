"""Export the trained Random Forest for the browser interface. Run after train.py."""

import json
from pathlib import Path

import joblib
from sklearn.datasets import load_wine


def main():
    root = Path(__file__).resolve().parent
    bundle = joblib.load(root / "wine_model.joblib")
    model = bundle["model"]
    data = load_wine()
    trees = []
    for estimator in model.estimators_:
        tree = estimator.tree_
        values = tree.value[:, 0, :]
        values = values / values.sum(axis=1, keepdims=True)
        trees.append({
            "left": tree.children_left.tolist(),
            "right": tree.children_right.tolist(),
            "feature": tree.feature.tolist(),
            "threshold": tree.threshold.tolist(),
            "value": values.tolist(),
        })
    payload = {
        "trees": trees,
        "features": list(bundle["feature_names"]),
        "classes": list(bundle["target_names"]),
        "importance": model.feature_importances_.tolist(),
        "ranges": [[float(data.data[:, i].min()), float(data.data[:, i].max())]
                   for i in range(data.data.shape[1])],
    }
    path = root / "web" / "model.json"
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"Saved browser model to {path}")


if __name__ == "__main__":
    main()
