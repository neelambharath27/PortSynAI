import { api, tokenStorage } from "./api";
import type { AuthUser, LoginPayload } from "../types/auth";

interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: AuthUser["role"];
  phone: string | null;
  is_active: boolean;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: BackendUser;
}

function toAuthUser(user: BackendUser): AuthUser {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarInitials: initials || "U",
  };
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const { data } = await api.post<TokenResponse>("/auth/login", {
    email: payload.email,
    password: payload.password,
    role: payload.role,
  });

  tokenStorage.set(data.access_token, data.refresh_token);
  return toAuthUser(data.user);
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (!tokenStorage.getAccess()) return null;
  try {
    const { data } = await api.get<BackendUser>("/auth/me");
    return toAuthUser(data);
  } catch {
    return null;
  }
}

export function logout() {
  tokenStorage.clear();
}

export function getToken(): string | null {
  return tokenStorage.getAccess();
}
