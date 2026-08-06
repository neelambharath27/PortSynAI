import { motion } from "framer-motion";
import {
  MapIcon,
  CubeTransparentIcon,
  ChartBarSquareIcon,
  ShieldExclamationIcon,
  ViewfinderCircleIcon,
  ScaleIcon,
  LightBulbIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

const FEATURES = [
  { icon: MapIcon, title: "Live Container Tracking", body: "Interactive map with animated markers, geofencing, and real-time search across every active container." },
  { icon: CubeTransparentIcon, title: "Digital Twin", body: "Synchronized virtual replicas tracking temperature, humidity, battery, and sensor health." },
  { icon: ChartBarSquareIcon, title: "AI Route Prediction", body: "LSTM-based forecasting of routes, ETAs, and delay probability before they happen." },
  { icon: ShieldExclamationIcon, title: "Anomaly Detection", body: "Isolation Forest flags route deviation, GPS spoofing, unauthorized stops, and more." },
  { icon: ViewfinderCircleIcon, title: "Cargo Inspection", body: "YOLOv8 scans X-ray imagery for weapons, explosives, and illegal material with bounding boxes." },
  { icon: ScaleIcon, title: "Risk Assessment", body: "XGBoost fuses GPS, RFID, sensor, manifest, and vision signals into a single risk score." },
  { icon: LightBulbIcon, title: "Explainable AI", body: "SHAP breaks down exactly which features drove a high-risk classification." },
  { icon: LinkIcon, title: "Blockchain Clearance", body: "Every approval or rejection is hashed to a permissioned ledger for full auditability." },
];

export function Features() {
  return (
    <section id="features" className="bg-navy-950 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-400">
            Platform Capabilities
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            Built for every desk on the terminal floor.
          </h2>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: (i % 4) * 0.08 }}
              className="group rounded-2xl border border-white/[0.06] bg-navy-900/50 p-5 transition-colors hover:border-cyan-500/25 hover:bg-navy-900"
            >
              <f.icon className="h-6 w-6 text-cyan-400 transition-transform group-hover:-translate-y-0.5" />
              <h3 className="mt-4 font-display text-sm font-semibold text-white">
                {f.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
