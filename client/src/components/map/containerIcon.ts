import L from "leaflet";
import type { ContainerStatus } from "../../types/tracking";
import { STATUS_HEX } from "../../utils/statusColors";

export function createContainerIcon(
  status: ContainerStatus,
  heading: number,
  selected: boolean,
): L.DivIcon {
  const color = STATUS_HEX[status];
  const size = selected ? 26 : 18;
  const pulse = status === "moving" || status === "high_risk";

  const html = `
    <div style="position:relative; width:${size}px; height:${size}px;">
      ${
        pulse
          ? `<div style="position:absolute; inset:-6px; border-radius:9999px; background:${color}33; animation: portsynai-pulse 2s ease-in-out infinite;"></div>`
          : ""
      }
      <div style="
        width:${size}px; height:${size}px; border-radius:9999px;
        background:${color}; border:2px solid rgba(5,11,24,0.9);
        box-shadow:0 0 0 1px ${color}55, 0 2px 6px rgba(0,0,0,0.4);
        transform: rotate(${heading}deg);
        display:flex; align-items:center; justify-content:center;
      ">
        <svg width="${size * 0.55}" height="${size * 0.55}" viewBox="0 0 24 24" fill="none">
          <path d="M12 2 L19 20 L12 16 L5 20 Z" fill="rgba(5,11,24,0.85)" />
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "portsynai-container-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
