"""
SHAP explainability for the PortSynAI risk-fusion model.

This module explains the SAME XGBoost model used by
app.services.xgboost_risk.

The current XGBoost model is trained on deterministic synthetic prototype
data because the project does not yet contain a labeled real-world customs
incident dataset.

SHAP therefore explains the actual prototype XGBoost model, but the
explanations must not be presented as validated explanations of real-world
customs outcomes.
"""

from __future__ import annotations

import threading

import numpy as np
import pandas as pd
import shap

from app.services.xgboost_risk import (
    FEATURES,
    FEATURE_LABELS,
    XGBoostRiskService,
)


# ---------------------------------------------------------------------------
# SHAP state
# ---------------------------------------------------------------------------

_lock = threading.Lock()

_explainer: shap.TreeExplainer | None = None


# ---------------------------------------------------------------------------
# Model / explainer
# ---------------------------------------------------------------------------

def _get_explainer() -> shap.TreeExplainer:
    """
    Create a SHAP TreeExplainer for the exact XGBoost risk model.

    The XGBoost model itself is already cached by XGBoostRiskService.
    """

    global _explainer

    if _explainer is not None:
        return _explainer

    with _lock:

        if _explainer is not None:
            return _explainer

        model = XGBoostRiskService.get_model()

        _explainer = shap.TreeExplainer(model)

        return _explainer


# ---------------------------------------------------------------------------
# Explain one risk vector
# ---------------------------------------------------------------------------

def explain(
    feature_vector: dict[str, float],
) -> dict:
    """
    Explain one PortSynAI risk assessment.

    Parameters
    ----------
    feature_vector:
        Dictionary containing the same eight features consumed by the
        XGBoost risk model.

    Returns
    -------
    dict
        Contains:
        - final_score
        - risk_level
        - base_value
        - contributions
    """

    # ---------------------------------------------------------------
    # Get the SAME XGBoost model used by risk assessment
    # ---------------------------------------------------------------

    model = XGBoostRiskService.get_model()

    # ---------------------------------------------------------------
    # Prepare feature vector in exactly the model's feature order
    # ---------------------------------------------------------------

    values = []

    for feature in FEATURES:

        value = float(
            feature_vector.get(
                feature,
                0.0,
            )
        )

        value = max(
            0.0,
            min(
                100.0,
                value,
            ),
        )

        values.append(value)

    row = pd.DataFrame(
        [values],
        columns=FEATURES,
    )

    # ---------------------------------------------------------------
    # Model prediction
    # ---------------------------------------------------------------

    probability = float(
        model.predict_proba(row)[0][1]
    )

    final_score = round(
        probability * 100.0,
        1,
    )

    # ---------------------------------------------------------------
    # SHAP explanation
    # ---------------------------------------------------------------

    explainer = _get_explainer()

    shap_output = explainer.shap_values(row)

    # XGBClassifier normally returns:
    #   array shape -> (1, number_of_features)
    #
    # Handle both scalar/list/array representations safely.

    shap_array = np.asarray(
        shap_output
    )

    if shap_array.ndim == 1:

        shap_values = shap_array

    elif shap_array.ndim == 2:

        shap_values = shap_array[0]

    else:

        shap_values = shap_array.reshape(
            -1
        )[: len(FEATURES)]

    # ---------------------------------------------------------------
    # Expected / base value
    # ---------------------------------------------------------------

    expected_value = explainer.expected_value

    expected_array = np.asarray(
        expected_value
    ).reshape(-1)

    base_value = float(
        expected_array[0]
    )

    # ---------------------------------------------------------------
    # Feature contributions
    # ---------------------------------------------------------------

    contributions = []

    for index, feature in enumerate(FEATURES):

        shap_value = float(
            shap_values[index]
        )

        contributions.append(
            {
                "feature": feature,

                "label": FEATURE_LABELS.get(
                    feature,
                    feature,
                ),

                "feature_value": round(
                    values[index],
                    2,
                ),

                "shap_value": round(
                    shap_value,
                    6,
                ),

                "direction": (
                    "increases_risk"
                    if shap_value > 0
                    else "decreases_risk"
                    if shap_value < 0
                    else "neutral"
                ),
            }
        )

    # Highest absolute SHAP contribution first
    contributions.sort(
        key=lambda item: abs(
            item["shap_value"]
        ),
        reverse=True,
    )

    # ---------------------------------------------------------------
    # Return explanation
    # ---------------------------------------------------------------

    return {
        "probability": round(
            probability,
            6,
        ),

        "final_score": final_score,

        "base_value": base_value,

        "contributions": contributions,
    }