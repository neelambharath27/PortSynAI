import { motion } from "framer-motion";

const STATS = [
  { value: "38%", label: "Cargo clearance time reduced" },
  { value: "21%", label: "False positives reduced" },
  { value: "<2s", label: "Dashboard response time" },
  { value: "97.1%", label: "Risk classification accuracy" },
];

export function Advantages() {
  return (
    <section id="advantages" className="bg-navy-950 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-mono text-xs uppercase tracking-widest text-cyan-400">
              Advantages
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
              Faster clearance. Fewer blind spots. Full accountability.
            </h2>
            <ul className="mt-6 space-y-4">
              {[
                "Unified visibility across tracking, risk, and compliance teams in one console.",
                "Explainable decisions that hold up to customs and regulatory audit.",
                "Immutable clearance records that remove disputes over approval history.",
                "Digital twin simulation that catches sensor failures before they escalate.",
              ].map((line) => (
                <li key={line} className="flex gap-3 text-sm text-ink-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  {line}
                </li>
              ))}
            </ul>
          </motion.div>

          <div className="grid grid-cols-2 gap-5">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-panel rounded-2xl p-6"
              >
                <p className="font-display text-3xl font-semibold text-cyan-400">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs leading-snug text-ink-500">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
