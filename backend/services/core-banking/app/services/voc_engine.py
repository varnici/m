"""
VentureRoot — Vote of Confidence Engine

Binary weighted scoring system — prevents gaming via star inflation.
Four dimensions with fixed weights derived from platform specifications.
"""

from dataclasses import dataclass
from typing import Union


# Weight constants (must sum to 1.0)
WEIGHT_GOODS_CONDITION  = 0.40
WEIGHT_ON_TIME          = 0.30
WEIGHT_COMMUNICATION    = 0.20
WEIGHT_CORRECT_DELIVERY = 0.10


@dataclass
class VocInputs:
    goods_condition:   bool          # Did goods arrive undamaged and intact?
    on_time:           Union[bool, str]  # True=full, "partial"=half, False=zero
    communication:     bool          # Was provider responsive and professional?
    correct_delivery:  bool          # Were goods delivered to correct address?


class VoteOfConfidenceEngine:

    def calculate_score(
        self,
        goods_condition: bool,
        on_time: Union[bool, str],
        communication: bool,
        correct_delivery: bool,
    ) -> float:
        """
        Returns a weighted score 0.0 – 5.0.

        Scoring per dimension:
          - goods_condition:   True → 5.0,  False → 0.0
          - on_time:           True → 5.0,  'partial' → 2.5,  False → 0.0
          - communication:     True → 5.0,  False → 0.0
          - correct_delivery:  True → 5.0,  False → 0.0
        """
        gc_score   = 5.0 if goods_condition else 0.0
        ot_score   = 5.0 if on_time is True else (2.5 if on_time == "partial" else 0.0)
        comm_score = 5.0 if communication else 0.0
        cd_score   = 5.0 if correct_delivery else 0.0

        composite = (
            gc_score   * WEIGHT_GOODS_CONDITION  +
            ot_score   * WEIGHT_ON_TIME          +
            comm_score * WEIGHT_COMMUNICATION    +
            cd_score   * WEIGHT_CORRECT_DELIVERY
        )
        return round(composite, 2)

    def update_provider_rating(
        self,
        current_rating: float,
        total_jobs: int,
        new_score: float,
    ) -> float:
        """
        Incremental weighted average — protects established providers from
        single outlier reviews while still allowing ratings to move.

        Uses dampened update for high-job-count providers.
        New providers (< 10 jobs) update faster to establish a baseline.
        """
        if total_jobs == 0:
            return round(new_score, 2)

        # Weight for new rating: lower as job count grows (min 5%)
        new_weight = max(0.05, 1.0 / (total_jobs + 1))
        updated = (current_rating * (1 - new_weight)) + (new_score * new_weight)
        return round(updated, 2)

    def get_badge(self, rating: float, total_jobs: int) -> str:
        """Return badge label based on rating band."""
        if total_jobs < 10:
            return "standard"  # insufficient data for elite/verified
        if rating >= 4.5:
            return "elite"
        if rating >= 4.0:
            return "verified"
        if rating >= 3.5:
            return "standard"
        if rating >= 3.0:
            return "under_review"
        return "suspended"

    def is_anomaly(self, current_rating: float, new_score: float, threshold: float = 4.5) -> bool:
        """
        Flag when a provider with strong history gets a very low score.
        Triggers manual quarantine — 48h review before publishing.
        """
        return current_rating >= threshold and new_score < 2.0

    def explain_score(
        self,
        goods_condition: bool,
        on_time: Union[bool, str],
        communication: bool,
        correct_delivery: bool,
    ) -> dict:
        """Returns per-dimension breakdown for transparency UI."""
        gc_score   = 5.0 if goods_condition else 0.0
        ot_score   = 5.0 if on_time is True else (2.5 if on_time == "partial" else 0.0)
        comm_score = 5.0 if communication else 0.0
        cd_score   = 5.0 if correct_delivery else 0.0

        return {
            "goods_condition":   {"raw": gc_score,   "weighted": round(gc_score   * WEIGHT_GOODS_CONDITION,  2), "weight": WEIGHT_GOODS_CONDITION},
            "on_time":           {"raw": ot_score,   "weighted": round(ot_score   * WEIGHT_ON_TIME,          2), "weight": WEIGHT_ON_TIME},
            "communication":     {"raw": comm_score, "weighted": round(comm_score * WEIGHT_COMMUNICATION,    2), "weight": WEIGHT_COMMUNICATION},
            "correct_delivery":  {"raw": cd_score,   "weighted": round(cd_score   * WEIGHT_CORRECT_DELIVERY, 2), "weight": WEIGHT_CORRECT_DELIVERY},
            "composite":         self.calculate_score(goods_condition, on_time, communication, correct_delivery),
        }