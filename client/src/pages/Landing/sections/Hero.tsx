import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon, PlayCircleIcon } from "@heroicons/react/24/outline";

const LANES = [
  "M -50 120 C 250 60, 550 180, 900 100",
  "M -50 260 C 300 320, 600 200, 950 280",
  "M -50 400 C 280 360, 650 460, 950 400",
];

const SHIPS = [
  { top: 96, delay: 0, duration: 18 },
  { top: 236, delay: 4, duration: 22 },
  { top: 376, delay: 9, duration: 20 },
];

function ContainerShip() {
  return (
    <svg width="46" height="24" viewBox="0 0 46 24" fill="none">
      <path d="M2 16h42l-4 6H6l-4-6Z" fill="#101F35" stroke="#22D3EE" strokeWidth="1" />
      <rect x="6" y="6" width="8" height="8" fill="#0891B2" opacity="0.85" />
      <rect x="15" y="6" width="8" height="8" fill="#22D3EE" opacity="0.7" />
      <rect x="24" y="6" width="8" height="8" fill="#0891B2" opacity="0.85" />
      <rect x="33" y="9" width="7" height="5" fill="#22D3EE" opacity="0.6" />
    </svg>
  );
}

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-navy-950 pt-24">
      {/* Grid backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-grid-lines bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_40%,transparent_100%)]" />

      {/* Radar sweep - digital twin monitoring motif */}
      <div className="pointer-events-none absolute -right-40 top-24 h-[520px] w-[520px] opacity-30 lg:opacity-50">
        <div className="absolute inset-0 rounded-full border border-cyan-500/20" />
        <div className="absolute inset-12 rounded-full border border-cyan-500/15" />
        <div className="absolute inset-24 rounded-full border border-cyan-500/10" />
        <div className="absolute inset-0 animate-radar-sweep [transform-origin:center]">
          <div className="h-full w-1/2 origin-right bg-gradient-to-l from-cyan-400/25 to-transparent" />
        </div>
      </div>

      {/* Shipping lanes with moving container ships */}
      <div className="pointer-events-none absolute inset-0">
        <svg className="h-full w-full" viewBox="0 0 900 500" preserveAspectRatio="none">
          {LANES.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="#22D3EE"
              strokeOpacity="0.18"
              strokeWidth="1.5"
              strokeDasharray="6 10"
              className="animate-lane-move"
            />
          ))}
        </svg>
        {SHIPS.map((ship, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ top: ship.top }}
            initial={{ left: "-5%", opacity: 0 }}
            animate={{ left: "105%", opacity: [0, 1, 1, 0] }}
            transition={{
              duration: ship.duration,
              delay: ship.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <ContainerShip />
          </motion.div>
        ))}
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2 lg:px-10">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/5 px-3.5 py-1.5"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-400">
              B.Tech Major Project · Hybrid AI + Digital Twin
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 font-display text-4xl font-semibold leading-[1.1] text-white sm:text-5xl lg:text-6xl"
          >
            Command your port with a{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-cyan-500 bg-clip-text text-transparent">
              digital twin
            </span>{" "}
            that thinks.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-lg text-base leading-relaxed text-ink-300"
          >
            A hybrid AI framework unifying real-time container tracking,
            explainable anomaly detection, and blockchain-secured cargo
            clearance — built to operate at the scale of a modern container
            terminal.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <button onClick={() => navigate("/login")} className="btn-primary">
              Enter Command Console
              <ArrowRightIcon className="h-4 w-4" />
            </button>
            <a href="#overview" className="btn-secondary">
              <PlayCircleIcon className="h-4.5 w-4.5" />
              See how it works
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 grid grid-cols-3 gap-6 border-t border-white/[0.06] pt-6"
          >
            {[
              ["98.6%", "Tracking Accuracy"],
              ["95.4%", "Anomaly Detection"],
              ["38%", "Faster Clearance"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="font-display text-2xl font-semibold text-white">
                  {value}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Digital twin preview card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="glass-panel relative hidden rounded-2xl p-6 lg:block"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-cyan-400">
                Digital Twin · Container MSKU-771204
              </p>
              <p className="mt-1 text-sm text-white">
                Live synchronization active
              </p>
            </div>
            <span className="status-pill border border-status-success/25 bg-status-success/10 text-status-success">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-status-success" />
              Synced
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            {[
              ["Temperature", "4.2°C"],
              ["Humidity", "62%"],
              ["Battery", "87%"],
              ["Speed", "18.4 kn"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[11px] text-ink-500">{label}</p>
                <p className="mt-1 font-mono text-lg text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 h-28 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex h-full items-end gap-1.5">
              {[40, 65, 50, 80, 60, 90, 70, 55, 85, 62, 75, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-cyan-500/70 to-cyan-400"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
            <span className="text-xs text-ink-300">Risk classification</span>
            <span className="font-mono text-xs font-semibold text-status-success">
              LOW · 12.4
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
