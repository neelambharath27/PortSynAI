import { Link, Outlet } from "react-router-dom";
import { Logo } from "../components/ui/Logo";

export function AuthLayout() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Branding panel */}
      <div className="relative hidden overflow-hidden bg-navy-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-grid-lines bg-[size:40px_40px] opacity-40" />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <Link to="/" className="relative z-10">
          <Logo />
        </Link>

        <div className="relative z-10 max-w-md">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-400">
            Smart Port Intelligence Platform
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-white">
            Real-time visibility across every container, berth, and cargo
            manifest.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-300">
            Digital twin simulation, explainable risk scoring, and secure
            blockchain-backed clearance — unified in a single command
            surface.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6 border-t border-white/[0.06] pt-6">
          <div>
            <p className="font-display text-2xl font-semibold text-white">98.6%</p>
            <p className="text-xs text-ink-500">Tracking Accuracy</p>
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-white">97.1%</p>
            <p className="text-xs text-ink-500">Risk Classification</p>
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-white">&lt;2s</p>
            <p className="text-xs text-ink-500">Dashboard Response</p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-navy-950 px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-10 flex justify-center lg:hidden">
            <Logo />
          </Link>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
