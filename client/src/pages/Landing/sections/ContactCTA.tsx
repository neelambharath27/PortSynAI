import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

export function ContactCTA() {
  const navigate = useNavigate();

  return (
    <section className="bg-navy-900 py-20">
      <div className="mx-auto max-w-5xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="glass-panel relative overflow-hidden rounded-3xl p-10 text-center sm:p-14"
        >
          <div className="pointer-events-none absolute inset-0 bg-grid-lines bg-[size:36px_36px] opacity-20" />
          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-widest text-cyan-400">
              Get in touch
            </p>
            <h2 className="mx-auto mt-3 max-w-xl font-display text-3xl font-semibold text-white sm:text-4xl">
              Ready to walk through the full command console?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-ink-300">
              Sign in with any of the four operator roles to explore live
              tracking, risk scoring, and blockchain clearance in action.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button onClick={() => navigate("/login")} className="btn-primary">
                Enter Console
                <ArrowRightIcon className="h-4 w-4" />
              </button>
              <a href="mailto:contact@portsynai.io" className="btn-secondary">
                contact@portsynai.io
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
