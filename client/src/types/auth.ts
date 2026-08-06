export type UserRole =
  | "administrator"
  | "port_operator"
  | "customs_officer"
  | "security_officer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  role: UserRole;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  administrator: "Administrator",
  port_operator: "Port Operator",
  customs_officer: "Customs Officer",
  security_officer: "Security Officer",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  administrator: "Full platform access & system configuration",
  port_operator: "Live tracking, digital twin & prediction tools",
  customs_officer: "Inspection, risk scoring & cargo clearance",
  security_officer: "Anomaly monitoring & security alerts",
};
