"""
SHAP-based explainability for the port risk-assessment model.

There's no historical labeled dataset in this project to train against (the
`risk_scores` table is itself demo-seeded, not observed outcomes), so this
module trains a small, deterministic XGBoost classifier on a synthetically
generated — but realistically distributed — dataset built from the same
feature definitions the frontend renders. This is a real trained
`xgboost.XGBClassifier` explained with a real `shap.TreeExplainer`; nothing
about the SHAP values themselves is faked. The synthetic step is only
standing in for the labeled training corpus a production deployment would
have collected from real customs outcomes.

The model + explainer are trained once and cached as module-level
singletons (`_get_model()`), which is what "cache SHAP explanations" means
at the model layer — the per-container explanation *results* are cached
separately, in the `explanations` table, by `ExplainabilityService`.
"""

import threading

import numpy as np
import pandas as pd
import shap
from xgboost import XGBClassifier

FEATURES: list[str] = [
    "temperature",
    "humidity",
    "battery",
    "delay",
    "gps",
    "manifest",
    "rfid",
    "yolo_detection",
    "door_status",
]

FEATURE_LABELS: dict[str, str] = {
    "temperature": "Temperature",
    "humidity": "Humidity",
    "battery": "Battery",
    "delay": "Delay",
    "gps": "GPS",
    "manifest": "Manifest",
    "rfid": "RFID",
    "yolo_detection": "YOLO Detection",
    "door_status": "Door Status",
}

_RANDOM_SEED = 42
_TRAIN_SAMPLES = 4000

_lock = threading.Lock()
_model: XGBClassifier | None = None
_explainer: "shap.TreeExplainer | None" = None


def _synthetic_training_data(n: int = _TRAIN_SAMPLES) -> tuple[pd.DataFrame, np.ndarray]:
    """Build a synthetic training corpus over the 9 named risk features.

    Every feature is expressed on a common 0-100 "risk contribution" scale
    (0 = no anomaly, 100 = maximally anomalous), so the same feature vector
    format works whether the underlying reading is a temperature in °C, a
    boolean door state, or an existing 0-40 GPS anomaly sub-score. The label
    is a weighted, noisy combination standing in for a real customs outcome,
    so the trained model learns sensible, monotonic-ish relationships
    between each feature and risk — which is what makes the resulting SHAP
    explanations look like genuine reasoning rather than noise.
    """
    rng = np.random.default_rng(_RANDOM_SEED)

    data = {feature: rng.uniform(0, 100, n) for feature in FEATURES}
    # Door status and a coin-flip on delay are closer to discrete signals in
    # practice, so bias them toward the extremes rather than uniform noise.
    data["door_status"] = rng.choice([0, 0, 0, 100], size=n).astype(float)

    df = pd.DataFrame(data)

    weights = {
        "temperature": 0.12,
        "humidity": 0.06,
        "battery": 0.10,
        "delay": 0.10,
        "gps": 0.18,
        "manifest": 0.16,
        "rfid": 0.10,
        "yolo_detection": 0.13,
        "door_status": 0.15,
    }
    weighted_sum = sum(df[f] * w for f, w in weights.items())
    noise = rng.normal(0, 8, n)
    score = weighted_sum + noise
    labels = (score > np.percentile(score, 65)).astype(int)

    return df, labels


def _get_model() -> tuple[XGBClassifier, "shap.TreeExplainer"]:
    global _model, _explainer
    if _model is not None and _explainer is not None:
        return _model, _explainer

    with _lock:
        if _model is not None and _explainer is not None:
            return _model, _explainer

        X, y = _synthetic_training_data()
        model = XGBClassifier(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=_RANDOM_SEED,
            eval_metric="logloss",
        )
        model.fit(X, y)

        _model = model
        _explainer = shap.TreeExplainer(model)
        return _model, _explainer


def explain(feature_vector: dict[str, float]) -> dict:
    """Run the model + SHAP explainer on one feature vector.

    Returns the predicted risk probability, the SHAP base value (the
    model's average output over the training set), and a per-feature SHAP
    contribution — everything the frontend needs for the feature
    importance chart, waterfall chart, and force plot.
    """
    model, explainer = _get_model()

    row = pd.DataFrame([[feature_vector.get(f, 0.0) for f in FEATURES]], columns=FEATURES)
    probability = float(model.predict_proba(row)[0][1])

    shap_values = explainer.shap_values(row)
    values = np.array(shap_values)[0]
    base_value = float(np.array(explainer.expected_value).reshape(-1)[0])

    contributions = [
        {
            "feature": feature,
            "label": FEATURE_LABELS[feature],
            "feature_value": round(float(feature_vector.get(feature, 0.0)), 1),
            "shap_value": round(float(values[i]), 4),
        }
        for i, feature in enumerate(FEATURES)
    ]

    return {
        "probability": probability,
        "base_value": base_value,
        "contributions": contributions,
    }
