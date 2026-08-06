import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../types/auth";

interface RoleBasedRouteProps {
  allowedRoles: UserRole[];
}

export function RoleBasedRoute({ allowedRoles }: RoleBasedRouteProps) {
  const { user } = useAuth();

  // ProtectedRoute (the parent route) already guarantees `user` is set by
  // the time this renders, but we guard again defensively.
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard/unauthorized" replace />;
  }

  return <Outlet />;
}
