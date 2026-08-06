import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function UnauthorizedPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[70vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-navy-900/40 p-10 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-500/10">
        <ShieldExclamationIcon className="h-7 w-7 text-coral-400" />
      </div>
      <h2 className="mt-5 font-display text-xl font-semibold text-white">
        You don&rsquo;t have access to this page
      </h2>
      <p className="mt-2 max-w-md text-sm text-ink-500">
        Your role doesn&rsquo;t include permission to view this section. If
        you believe this is a mistake, contact your administrator.
      </p>
      <Link
        to="/dashboard"
        className="status-pill mt-5 border border-cyan-500/25 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
      >
        Back to Dashboard
      </Link>
    </motion.div>
  );
}
