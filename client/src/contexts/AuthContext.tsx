import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isAxiosError } from "axios";
import type { AuthUser, LoginPayload } from "../types/auth";
import * as authService from "../services/authService";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBootstrapping: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On first load, if a token is already stored, verify it against the
  // backend (GET /auth/me) rather than trusting a cached user object.
  useEffect(() => {
    let cancelled = false;
    authService.fetchCurrentUser().then((current) => {
      if (!cancelled) {
        setUser(current);
        setIsBootstrapping(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(payload: LoginPayload) {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInUser = await authService.login(payload);
      setUser(loggedInUser);
    } catch (err) {
      const message = isAxiosError(err)
        ? (err.response?.data?.detail ?? "Login failed. Please try again.")
        : "Login failed. Please try again.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        isBootstrapping,
        error,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
