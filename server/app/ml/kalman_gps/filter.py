"""
Kalman filter for smoothing simulated GPS jitter on the Digital Twin.

Real GPS/AIS feeds are noisy: consumer-grade receivers on a moving vessel
typically wander a few meters between fixes even when the container isn't
actually changing course. Feeding that raw noise straight to the map makes
the marker visibly jitter every tick. A simple scalar Kalman filter run
independently on latitude and longitude removes that noise while still
tracking real movement, at negligible cost per tick.

This is a standard 1D Kalman filter for a (nearly) constant-value signal
observed through noise — not a full constant-velocity motion model. That's
a deliberate simplification: at a 1-second tick interval the true GPS
displacement between updates is small enough that a "value + noise" model
smooths well without needing velocity state.
"""

from dataclasses import dataclass


@dataclass
class _KalmanFilter1D:
    """Scalar Kalman filter: estimates a slowly-varying true value from a
    noisy measurement stream."""

    process_variance: float = 1e-5
    measurement_variance: float = 2.5e-4
    estimate: float | None = None
    error_estimate: float = 1.0

    def update(self, measurement: float) -> float:
        if self.estimate is None:
            # First observation seeds the filter directly.
            self.estimate = measurement
            return self.estimate

        # Predict step: no explicit motion model, so the prior estimate
        # carries forward with growing uncertainty.
        priori_estimate = self.estimate
        priori_error = self.error_estimate + self.process_variance

        # Update step: blend the prediction with the new measurement,
        # weighted by their relative uncertainty (the Kalman gain).
        kalman_gain = priori_error / (priori_error + self.measurement_variance)
        self.estimate = priori_estimate + kalman_gain * (measurement - priori_estimate)
        self.error_estimate = (1 - kalman_gain) * priori_error

        return self.estimate


class GpsKalmanFilter:
    """Independently smooths latitude and longitude for one container."""

    def __init__(self) -> None:
        self._lat_filter = _KalmanFilter1D()
        self._lng_filter = _KalmanFilter1D()

    def smooth(self, lat: float, lng: float) -> tuple[float, float]:
        smoothed_lat = self._lat_filter.update(lat)
        smoothed_lng = self._lng_filter.update(lng)
        return round(smoothed_lat, 6), round(smoothed_lng, 6)
