import {
  Squares2X2Icon,
  MapIcon,
  CubeTransparentIcon,
  ChartBarSquareIcon,
  ShieldExclamationIcon,
  ViewfinderCircleIcon,
  ScaleIcon,
  LightBulbIcon,
  LinkIcon,
  BellAlertIcon,
  DocumentChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import type { NavSection } from "../types/nav";

const ALL_ROLES = [
  "administrator",
  "port_operator",
  "customs_officer",
  "security_officer",
] as const;

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        icon: Squares2X2Icon,
        roles: [...ALL_ROLES],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Live Tracking",
        path: "/dashboard/tracking",
        icon: MapIcon,
        roles: ["administrator", "port_operator", "security_officer"],
      },
      {
        label: "Digital Twin",
        path: "/dashboard/digital-twin",
        icon: CubeTransparentIcon,
        roles: ["administrator", "port_operator"],
      },
      {
        label: "AI Prediction",
        path: "/dashboard/prediction",
        icon: ChartBarSquareIcon,
        roles: ["administrator", "port_operator"],
      },
      {
        label: "Anomaly Detection",
        path: "/dashboard/anomalies",
        icon: ShieldExclamationIcon,
        roles: ["administrator", "security_officer"],
      },
    ],
  },
  {
    title: "Cargo & Compliance",
    items: [
      {
        label: "Cargo Inspection",
        path: "/dashboard/inspection",
        icon: ViewfinderCircleIcon,
        roles: ["administrator", "customs_officer", "security_officer"],
      },
      {
        label: "Risk Assessment",
        path: "/dashboard/risk",
        icon: ScaleIcon,
        roles: ["administrator", "customs_officer"],
      },
      {
        label: "Explainable AI",
        path: "/dashboard/explainability",
        icon: LightBulbIcon,
        roles: ["administrator", "customs_officer"],
      },
      {
        label: "Blockchain Clearance",
        path: "/dashboard/blockchain",
        icon: LinkIcon,
        roles: ["administrator", "customs_officer"],
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Alerts",
        path: "/dashboard/alerts",
        icon: BellAlertIcon,
        roles: [...ALL_ROLES],
      },
      {
        label: "Reports",
        path: "/dashboard/reports",
        icon: DocumentChartBarIcon,
        roles: ["administrator", "port_operator", "customs_officer"],
      },
      {
        label: "Admin Panel",
        path: "/dashboard/admin",
        icon: UsersIcon,
        roles: ["administrator"],
      },
      {
        label: "Settings",
        path: "/dashboard/settings",
        icon: Cog6ToothIcon,
        roles: [...ALL_ROLES],
      },
    ],
  },
];
