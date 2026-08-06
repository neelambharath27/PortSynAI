import { Logo } from "../ui/Logo";

const COLUMNS = [
  {
    title: "Platform",
    links: ["Live Tracking", "Digital Twin", "AI Prediction", "Risk Engine"],
  },
  {
    title: "Compliance",
    links: ["Cargo Inspection", "Explainable AI", "Blockchain Clearance", "Audit Trail"],
  },
  {
    title: "Resources",
    links: ["Documentation", "API Reference", "System Status", "Research Paper"],
  },
];

export function Footer() {
  return (
    <footer id="contact" className="border-t border-white/[0.06] bg-navy-950">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">
              A hybrid AI framework unifying digital twin simulation and
              explainable machine learning for next-generation port
              operations.
            </p>
            <p className="mt-6 font-mono text-xs text-ink-500">
              contact@portsynai.io
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-display text-sm font-semibold text-white">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-ink-500 transition-colors hover:text-cyan-400"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-xs text-ink-500">
            © {new Date().getFullYear()} PortSynAI. B.Tech Major Project — Hybrid AI Framework for Smart Port Operations.
          </p>
          <p className="font-mono text-xs text-ink-500">
            v1.0.0 · Phase 1 Build
          </p>
        </div>
      </div>
    </footer>
  );
}
