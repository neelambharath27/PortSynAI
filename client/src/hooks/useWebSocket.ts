import { useEffect, useRef, useState } from "react";

export type WsStatus = "connecting" | "open" | "closed" | "error";

interface UseWebSocketOptions<T> {
  url: string | null;
  onMessage: (data: T) => void;
  enabled?: boolean;
}

export function useWebSocket<T>({
  url,
  onMessage,
  enabled = true,
}: UseWebSocketOptions<T>) {
  const [status, setStatus] = useState<WsStatus>("connecting");
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!url || !enabled) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let cancelled = false;

    function connect() {
      setStatus("connecting");
      socket = new WebSocket(url as string);

      socket.onopen = () => {
        attempt = 0;
        setStatus("open");
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as T;
          onMessageRef.current(parsed);
        } catch {
          // ignore malformed frames
        }
      };

      socket.onerror = () => {
        setStatus("error");
      };

      socket.onclose = () => {
        if (cancelled) return;
        setStatus("closed");
        attempt += 1;
        const delay = Math.min(1000 * 2 ** attempt, 15000);
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [url, enabled]);

  return { status };
}
