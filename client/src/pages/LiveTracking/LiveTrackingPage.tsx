import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SignalIcon, SignalSlashIcon } from "@heroicons/react/24/outline";
import { MapView } from "../../components/map/MapView";
import { TrackingToolbar } from "./components/TrackingToolbar";
import { ContainerListItem } from "./components/ContainerListItem";
import { ContainerDetailPanel } from "./components/ContainerDetailPanel";
import { useLiveTracking } from "../../hooks/useLiveTracking";
import { fetchRouteHistory } from "../../services/trackingService";
import type { ContainerStatus } from "../../types/tracking";

export function LiveTrackingPage() {
  const { containers, connectionStatus, isReady } = useLiveTracking();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContainerStatus | "all">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return containers.filter((c) => {
      const matchesSearch = c.container_code
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      const matchesStatus =
        statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [containers, search, statusFilter]);

  const selectedContainer =
    containers.find((c) => c.id === selectedId) ?? null;

  const { data: history } = useQuery({
    queryKey: ["route-history-map", selectedId],
    queryFn: () => fetchRouteHistory(selectedId as string),
    enabled: Boolean(selectedId),
    refetchInterval: 8000,
  });

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4 lg:flex-row">
      {/* Sidebar: search, filters, container list */}
      <div className="glass-panel flex w-full shrink-0 flex-col rounded-2xl p-4 lg:w-80">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-white">
            Container Fleet
          </h2>
          <span
            className={`flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide ${
              connectionStatus === "open"
                ? "text-status-success"
                : "text-status-warning"
            }`}
          >
            {connectionStatus === "open" ? (
              <SignalIcon className="h-3.5 w-3.5" />
            ) : (
              <SignalSlashIcon className="h-3.5 w-3.5" />
            )}
            {connectionStatus === "open" ? "Live" : "Reconnecting"}
          </span>
        </div>

        <TrackingToolbar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          resultCount={filtered.length}
        />

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {!isReady && (
            <p className="mt-8 text-center text-xs text-ink-500">
              Connecting to live GPS feed…
            </p>
          )}
          {isReady && filtered.length === 0 && (
            <p className="mt-8 text-center text-xs text-ink-500">
              No containers match your search or filters.
            </p>
          )}
          {filtered.map((container) => (
            <ContainerListItem
              key={container.id}
              container={container}
              selected={container.id === selectedId}
              onClick={() =>
                setSelectedId((prev) =>
                  prev === container.id ? null : container.id,
                )
              }
            />
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="glass-panel relative flex-1 overflow-hidden rounded-2xl">
        <MapView
          containers={filtered}
          selectedId={selectedId}
          onSelect={(id) =>
            setSelectedId((prev) => (prev === id ? null : id))
          }
          routeWaypoints={history?.waypoints ?? []}
        />
      </div>

      {/* Detail drawer */}
      {selectedContainer && (
        <div className="w-full shrink-0 lg:w-80">
          <ContainerDetailPanel
            container={selectedContainer}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  );
}
