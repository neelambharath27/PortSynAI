import { motion } from "framer-motion";
import {
  CubeTransparentIcon,
  ShieldCheckIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

const PILLARS = [
  {
    icon: CubeTransparentIcon,
    title: "Digital Twin Simulation",
    body: "Every container is mirrored in a live virtual model — synchronizing GPS, temperature, humidity, and movement data in real time.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Explainable Risk Intelligence",
    body: "Isolation Forest and XGBoost surface anomalies and risk scores, while SHAP explains exactly which factors drove each decision.",
  },
  {
    icon: LinkIcon,
    title: "Secure Cargo Clearance",
    body: "Clearance decisions are recorded on a permissioned blockchain ledger, giving customs and security teams a tamper-evident audit trail.",
  },
];

export function Overview() {
  return (
    <section id="overview" className="relative bg-navy-900 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-400">
            Project Overview
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            One hybrid framework, three intelligence layers.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-300">
            This platform fuses a digital twin of port operations with a
            hybrid AI pipeline — LSTM for prediction, Isolation Forest for
            anomaly detection, YOLOv8 for cargo inspection, and XGBoost with
            SHAP for transparent risk scoring — then secures every clearance
            decision on a blockchain ledger.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-panel rounded-2xl p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10">
                <pillar.icon className="h-5.5 w-5.5 text-cyan-400" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-white">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                {pillar.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
