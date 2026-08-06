import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ContainerLive, RouteWaypoint } from "../../types/tracking";
import { STATUS_LABELS } from "../../types/tracking";
import { createContainerIcon } from "./containerIcon";

interface MapViewProps {
  containers: ContainerLive[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  routeWaypoints: RouteWaypoint[];
}

function FlyToSelected({ container }: { container: ContainerLive | null }) {
  const map = useMap();
  useEffect(() => {
    if (container) {
      map.flyTo([container.lat, container.lng], Math.max(map.getZoom(), 5), {
        duration: 1.1,
      });
    }
  }, [container?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function MapView({
  containers,
  selectedId,
  onSelect,
  routeWaypoints,
}: MapViewProps) {
  const selected = containers.find((c) => c.id === selectedId) ?? null;
  const mapRef = useRef<L.Map | null>(null);

  const polylinePositions: [number, number][] = routeWaypoints.map((w) => [
    w.lat,
    w.lng,
  ]);

  return (
    <MapContainer
      center={[15, 60]}
      zoom={3}
      minZoom={2}
      worldCopyJump
      className="h-full w-full"
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {containers.map((c) => (
        <Marker
          key={c.id}
          position={[c.lat, c.lng]}
          icon={createContainerIcon(c.status, c.heading, c.id === selectedId)}
          eventHandlers={{ click: () => onSelect(c.id) }}
        >
          <Popup>
            <div className="space-y-1 font-mono">
              <p className="text-xs font-semibold text-white">
                {c.container_code}
              </p>
              <p>Status: {STATUS_LABELS[c.status]}</p>
              <p>Speed: {c.speed} kn</p>
              {c.destination_port && <p>To: {c.destination_port}</p>}
            </div>
          </Popup>
        </Marker>
      ))}

      {polylinePositions.length > 1 && (
        <Polyline
          positions={polylinePositions}
          pathOptions={{ color: "#22D3EE", weight: 2.5, opacity: 0.8, dashArray: "1 8" }}
        />
      )}

      <FlyToSelected container={selected} />
    </MapContainer>
  );
}
