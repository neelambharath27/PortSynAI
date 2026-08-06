import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BuildingOffice2Icon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  UserCircleIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type UserRole,
} from "../../types/auth";

const ROLE_OPTIONS: { role: UserRole; icon: typeof UserCircleIcon }[] = [
  { role: "administrator", icon: ShieldCheckIcon },
  { role: "port_operator", icon: BuildingOffice2Icon },
  { role: "customs_officer", icon: ClipboardDocumentCheckIcon },
  { role: "security_officer", icon: UserCircleIcon },
];

const DEMO_EMAILS: Record<UserRole, string> = {
  administrator: "admin@portsynai.io",
  port_operator: "operator@portsynai.io",
  customs_officer: "customs@portsynai.io",
  security_officer: "security@portsynai.io",
};

export function LoginPage() {
  const [role, setRole] = useState<UserRole>("port_operator");
  const [email, setEmail] = useState("operator@portsynai.io");
  const [password, setPassword] = useState("portsynai123");
  const { login, isLoading, error } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login({ email, password, role });
      notify({
        kind: "success",
        title: "Signed in successfully",
        message: `Welcome back — ${ROLE_LABELS[role]} access granted.`,
      });
      navigate("/dashboard");
    } catch {
      notify({ kind: "error", title: "Sign in failed", message: "Please check your credentials." });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="font-display text-2xl font-semibold text-white">
        Sign in to your console
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Select your role and enter credentials to continue.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        {ROLE_OPTIONS.map(({ role: r, icon: Icon }) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setRole(r);
              setEmail(DEMO_EMAILS[r]);
            }}
            className={`flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-colors ${
              role === r
                ? "border-cyan-500/50 bg-cyan-500/5"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <Icon
              className={`h-5 w-5 ${role === r ? "text-cyan-400" : "text-ink-500"}`}
            />
            <span className="text-xs font-semibold text-white">
              {ROLE_LABELS[r]}
            </span>
            <span className="text-[11px] leading-snug text-ink-500">
              {ROLE_DESCRIPTIONS[r]}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-300">
            Email
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-cyan-500/50">
            <EnvelopeIcon className="h-4 w-4 text-ink-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder:text-ink-500 focus:outline-none"
              placeholder="you@portsynai.io"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-300">
            Password
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-cyan-500/50">
            <LockClosedIcon className="h-4 w-4 text-ink-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder:text-ink-500 focus:outline-none"
              placeholder="Enter password"
            />
          </div>
        </div>

        {error && <p className="text-xs text-status-danger">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </button>

        <p className="text-center text-[11px] text-ink-500">
          Demo credentials are pre-filled — password{" "}
          <span className="font-mono text-cyan-400">portsynai123</span> for
          every seeded account. Authenticated against the live FastAPI +
          PostgreSQL backend.
        </p>
      </form>
    </motion.div>
  );
}
