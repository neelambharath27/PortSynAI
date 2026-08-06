import type { ComponentType, SVGProps } from "react";
import type { UserRole } from "./auth";

export interface NavItem {
  label: string;
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  roles: UserRole[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}
