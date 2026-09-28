from dataclasses import dataclass

from app.models.enums import ClearanceDecision, RiskLevel


@dataclass(frozen=True)
class ClearanceDecisionResult:
    decision: ClearanceDecision
    reason: str
    risk_score: float
    risk_level: RiskLevel


class ClearanceDecisionService:
    """
    Prototype customs decision policy.

    Converts the AI risk score into an operational recommendation:

        Score < 30       -> CLEAR
        Score 30-69.99   -> INSPECT
        Score >= 70      -> HOLD

    Score thresholds:
        CLEAR_THRESHOLD = 30.0
        HOLD_THRESHOLD  = 70.0
    """

    CLEAR_THRESHOLD = 30.0
    HOLD_THRESHOLD = 70.0

    @classmethod
    def decide(
        cls,
        final_score: float,
        risk_level: RiskLevel,
    ) -> ClearanceDecisionResult:
        """
        Convert an AI risk score into a clearance recommendation.

        The score is safely clamped to the 0-100 range before
        applying the decision thresholds.
        """

        score = max(0.0, min(100.0, float(final_score)))

        # LOW-RISK / CLEAR
        if score < cls.CLEAR_THRESHOLD:
            return ClearanceDecisionResult(
                decision=ClearanceDecision.CLEAR,
                reason=(
                    f"Risk score {score:.1f} is below the "
                    f"CLEAR threshold of {cls.CLEAR_THRESHOLD:.1f}."
                ),
                risk_score=score,
                risk_level=risk_level,
            )

        # MEDIUM-RISK / INSPECT
        if score < cls.HOLD_THRESHOLD:
            return ClearanceDecisionResult(
                decision=ClearanceDecision.INSPECT,
                reason=(
                    f"Risk score {score:.1f} requires additional "
                    f"inspection before clearance."
                ),
                risk_score=score,
                risk_level=risk_level,
            )

        # HIGH-RISK / HOLD
        return ClearanceDecisionResult(
            decision=ClearanceDecision.HOLD,
            reason=(
                f"Risk score {score:.1f} is at or above the "
                f"HOLD threshold of {cls.HOLD_THRESHOLD:.1f}."
            ),
            risk_score=score,
            risk_level=risk_level,
        )