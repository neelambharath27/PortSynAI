import { Link } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-6 text-center">
      <p className="font-mono text-sm text-cyan-400">ERROR 404</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-white">
        This coordinate doesn't exist on the map.
      </h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500">
        The page you're looking for may have been moved or never charted.
      </p>
      <Link to="/" className="btn-primary mt-8">
        <ArrowLeftIcon className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}
