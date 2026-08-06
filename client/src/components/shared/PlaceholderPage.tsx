import type { ComponentType, SVGProps } from "react";
import { motion } from "framer-motion";

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export function PlaceholderPage({
  title,
  description,
  phase,
  icon: Icon,
}: PlaceholderPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[70vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-navy-900/40 p-10 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
        <Icon className="h-7 w-7 text-cyan-400" />
      </div>
      <h2 className="mt-5 font-display text-xl font-semibold text-white">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm text-ink-500">{description}</p>
      <span className="status-pill mt-5 border border-cyan-500/25 bg-cyan-500/10 text-cyan-400">
        Scheduled — {phase}
      </span>
    </motion.div>
  );
}
