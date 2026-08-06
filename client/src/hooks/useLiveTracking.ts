import { useCallback, useEffect, useMemo, useState } from "react";
import { useWebSocket } from "./useWebSocket";
import {
  buildTrackingSocketUrl,
  fetchLiveSnapshot,
} from "../services/trackingService";
import type { ContainerLive, TrackingSnapshot } from "../types/tracking";

export function useLiveTracking() {
  const [containers, setContainers] = useState<Record<string, ContainerLive>>(
    {},
  );
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [restLoaded, setRestLoaded] = useState(false);

  const handleSnapshot = useCallback((snapshot: TrackingSnapshot) => {
    setServerTime(snapshot.server_time);
    setContainers((prev) => {
      const next = { ...prev };
      for (const c of snapshot.containers) {
        next[c.id] = c;
      }
      return next;
    });
  }, []);

  const socketUrl = useMemo(() => buildTrackingSocketUrl(), []);
  const { status } = useWebSocket<TrackingSnapshot>({
    url: socketUrl,
    onMessage: handleSnapshot,
  });

  // REST fallback: load an initial snapshot immediately (don't wait on the
  // socket handshake), and keep polling as a safety net if the socket is
  // ever down for an extended period.
  useEffect(() => {
    let cancelled = false;
    fetchLiveSnapshot()
      .then((snapshot) => {
        if (!cancelled) {
          handleSnapshot(snapshot);
          setRestLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setRestLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [handleSnapshot]);

  useEffect(() => {
    if (status === "open") return;
    const interval = setInterval(() => {
      fetchLiveSnapshot().then(handleSnapshot).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [status, handleSnapshot]);

  const containerList = useMemo(
    () => Object.values(containers).sort((a, b) => a.container_code.localeCompare(b.container_code)),
    [containers],
  );

  return {
    containers: containerList,
    serverTime,
    connectionStatus: status,
    isReady: restLoaded || containerList.length > 0,
  };
}
