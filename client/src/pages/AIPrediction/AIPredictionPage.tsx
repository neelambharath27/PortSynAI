import { useEffect, useState } from "react";
import {
  ChartBarSquareIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../services/api";

type Container = {
  id: string;
  container_code: string;
};

type Prediction = {
  container_id: string;
  container_code: string;

  current_temperature: number;
  predicted_temperature: number;

  current_humidity: number;
  predicted_humidity: number;

  current_battery_level: number;
  predicted_battery_level: number;

  anomaly_score: number;
  prediction_confidence: number;

  generated_at: string;
};

export function AIPredictionPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState("");
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  const [loadingContainers, setLoadingContainers] = useState(true);
  const [loadingPrediction, setLoadingPrediction] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    loadContainers();
  }, []);

  async function loadContainers() {
    try {
      setLoadingContainers(true);
      setError("");

      const response = await api.get("/containers");

      setContainers(response.data);

      if (response.data.length > 0) {
        setSelectedContainer(response.data[0].id);
      }
    } catch (err: any) {
      console.error("Container loading error:", err);
      setError("Unable to load containers.");
    } finally {
      setLoadingContainers(false);
    }
  }

  async function loadPrediction(containerId: string) {
    if (!containerId) return;

    try {
      setLoadingPrediction(true);
      setError("");

      const response = await api.get(
        `/prediction/container/${containerId}`
      );

      setPrediction(response.data);
    } catch (err: any) {
      console.error("Prediction error:", err);

      setPrediction(null);

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to generate AI prediction.");
      }
    } finally {
      setLoadingPrediction(false);
    }
  }

  useEffect(() => {
    if (selectedContainer) {
      loadPrediction(selectedContainer);
    }
  }, [selectedContainer]);

  function getRiskLevel(score: number) {
    if (score >= 70) return "HIGH";
    if (score >= 40) return "MEDIUM";
    return "LOW";
  }

  function getRiskClass(score: number) {
    if (score >= 70) {
      return "text-red-700 bg-red-100";
    }

    if (score >= 40) {
      return "text-yellow-700 bg-yellow-100";
    }

    return "text-green-700 bg-green-100";
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChartBarSquareIcon className="h-8 w-8 text-blue-600" />

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              AI Prediction
            </h1>

            <p className="text-sm text-gray-500">
              LSTM-based prediction of the next container sensor state.
            </p>
          </div>
        </div>

        {prediction && (
          <button
            onClick={() => loadPrediction(selectedContainer)}
            disabled={loadingPrediction}
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`h-5 w-5 ${
                loadingPrediction ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        )}
      </div>

      {/* Container Selection */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Select Container
        </label>

        {loadingContainers ? (
          <p className="text-sm text-gray-500">
            Loading containers...
          </p>
        ) : (
          <select
            value={selectedContainer}
            onChange={(e) => setSelectedContainer(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 md:w-96"
          >
            {containers.map((container) => (
              <option key={container.id} value={container.id}>
                {container.container_code}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Loading */}
      {loadingPrediction && (
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <CpuChipIcon className="mx-auto h-10 w-10 animate-pulse text-blue-600" />

          <p className="mt-3 text-gray-600">
            Running LSTM prediction...
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Analyzing the latest 12 sensor readings
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loadingPrediction && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />

            <div>
              <h3 className="font-semibold text-red-700">
                Prediction Error
              </h3>

              <p className="text-sm text-red-600">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prediction Dashboard */}
      {prediction && !loadingPrediction && (
        <>
          {/* Container Information */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Container
                </p>

                <p className="text-xl font-bold text-gray-900">
                  {prediction.container_code}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-400">
                  Generated
                </p>

                <p className="text-sm text-gray-600">
                  {new Date(
                    prediction.generated_at
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Prediction Cards */}
          <div className="grid gap-4 md:grid-cols-3">

            <PredictionCard
              title="Temperature"
              current={prediction.current_temperature}
              predicted={prediction.predicted_temperature}
              unit="°C"
            />

            <PredictionCard
              title="Humidity"
              current={prediction.current_humidity}
              predicted={prediction.predicted_humidity}
              unit="%"
            />

            <PredictionCard
              title="Battery Level"
              current={prediction.current_battery_level}
              predicted={prediction.predicted_battery_level}
              unit="%"
            />

          </div>

          {/* AI Metrics */}
          <div className="grid gap-4 md:grid-cols-2">

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">
                LSTM Anomaly Score
              </p>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-3xl font-bold text-gray-900">
                  {prediction.anomaly_score.toFixed(1)}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${getRiskClass(
                    prediction.anomaly_score
                  )}`}
                >
                  {getRiskLevel(prediction.anomaly_score)}
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${Math.min(
                      prediction.anomaly_score,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">
                Prediction Confidence
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-600">
                {(
                  prediction.prediction_confidence * 100
                ).toFixed(1)}
                %
              </p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${Math.min(
                      prediction.prediction_confidence * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

          </div>

          {/* Comparison Table */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b p-5">
              <h2 className="font-semibold text-gray-900">
                Current vs Predicted State
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">

                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3">
                      Parameter
                    </th>

                    <th className="px-5 py-3">
                      Current
                    </th>

                    <th className="px-5 py-3">
                      Predicted
                    </th>

                    <th className="px-5 py-3">
                      Change
                    </th>
                  </tr>
                </thead>

                <tbody>

                  <PredictionRow
                    name="Temperature"
                    current={prediction.current_temperature}
                    predicted={prediction.predicted_temperature}
                    unit="°C"
                  />

                  <PredictionRow
                    name="Humidity"
                    current={prediction.current_humidity}
                    predicted={prediction.predicted_humidity}
                    unit="%"
                  />

                  <PredictionRow
                    name="Battery"
                    current={prediction.current_battery_level}
                    predicted={prediction.predicted_battery_level}
                    unit="%"
                  />

                </tbody>
              </table>
            </div>
          </div>

          {/* Model Information */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex gap-3">
              <CpuChipIcon className="h-6 w-6 shrink-0 text-blue-600" />

              <div>
                <h3 className="font-semibold text-blue-900">
                  AI Model
                </h3>

                <p className="mt-1 text-sm text-blue-800">
                  A PyTorch LSTM analyzes the latest 12 sensor
                  readings and predicts the next temperature,
                  humidity, and battery state.
                </p>

                <p className="mt-2 text-xs text-blue-700">
                  The current prototype uses reproducible
                  synthetic training data for the LSTM model.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


function PredictionCard({
  title,
  current,
  predicted,
  unit,
}: {
  title: string;
  current: number;
  predicted: number;
  unit: string;
}) {
  const change = predicted - current;

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-sm text-gray-400">
            Current
          </p>

          <p className="text-2xl font-bold text-gray-900">
            {current.toFixed(1)}
            {unit}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-400">
            Predicted
          </p>

          <p className="text-2xl font-bold text-blue-600">
            {predicted.toFixed(1)}
            {unit}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Change: {change >= 0 ? "+" : ""}
        {change.toFixed(2)}
        {unit}
      </p>
    </div>
  );
}


function PredictionRow({
  name,
  current,
  predicted,
  unit,
}: {
  name: string;
  current: number;
  predicted: number;
  unit: string;
}) {
  const change = predicted - current;

  return (
    <tr className="border-t">
      <td className="px-5 py-4 font-medium text-gray-900">
        {name}
      </td>

      <td className="px-5 py-4">
        {current.toFixed(2)}
        {unit}
      </td>

      <td className="px-5 py-4 font-semibold text-blue-600">
        {predicted.toFixed(2)}
        {unit}
      </td>

      <td className="px-5 py-4">
        {change >= 0 ? "+" : ""}
        {change.toFixed(2)}
        {unit}
      </td>
    </tr>
  );
}