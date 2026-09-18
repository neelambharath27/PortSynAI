import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

export const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

const ACCESS_TOKEN_KEY = "portsynai-access-token";
const REFRESH_TOKEN_KEY = "portsynai-refresh-token";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),

  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),

  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },

  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccess();

    if (token) {
      config.headers.set(
        "Authorization",
        `Bearer ${token}`
      );
    }

    return config;
  }
);

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefresh();

  if (!refreshToken) {
    return null;
  }

  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {
        refresh_token: refreshToken,
      }
    );

    tokenStorage.set(
      data.access_token,
      data.refresh_token
    );

    return data.access_token as string;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as
        | (InternalAxiosRequestConfig & {
            _retry?: boolean;
          })
        | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;

      if (newToken) {
        originalRequest.headers.set(
          "Authorization",
          `Bearer ${newToken}`
        );

        return api(originalRequest);
      }

      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);