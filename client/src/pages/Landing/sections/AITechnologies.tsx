import { motion } from "framer-motion";

const STACK = [
  { name: "LSTM", role: "Route & ETA Prediction", metric: "96.8%", metricLabel: "ETA Accuracy" },
  { name: "Isolation Forest", role: "Anomaly Detection", metric: "95.4%", metricLabel: "Detection Rate" },
  { name: "YOLOv8", role: "X-ray Cargo Inspection", metric: "96.9%", metricLabel: "Detection Precision" },
  { name: "XGBoost", role: "Composite Risk Scoring", metric: "97.1%", metricLabel: "Risk Classification" },
  { name: "SHAP", role: "Explainable AI", metric: "100%", metricLabel: "Decisions Explained" },
];

export function AITechnologies() {
  return (
    <section id="ai-technology" className="relative overflow-hidden bg-navy-900 py-24">
      <div className="pointer-events-none absolute inset-0 bg-grid-lines bg-[size:40px_40px] opacity-20" />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-400">
            AI Technology Stack
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            Five models, one explainable pipeline.
          </h2>
        </motion.div>

        <div className="mt-14 space-y-3">
          {STACK.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="glass-panel flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-ink-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-display text-base font-semibold text-white">
                    {item.name}
                  </p>
                  <p className="text-xs text-ink-500">{item.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:pl-4">
                <span className="font-mono text-xl font-semibold text-cyan-400">
                  {item.metric}
                </span>
                <span className="text-[11px] text-ink-500">
                  {item.metricLabel}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
