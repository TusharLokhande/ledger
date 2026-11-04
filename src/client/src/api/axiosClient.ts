import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/constants/app.constants";
import { useAuthStore } from "@/store/authStore";
import { ErrorStatus } from "@/types/errorStatus.enum";
import type { ApiResponse } from "@/types/apiResponse.types";
import type { AuthResult } from "@/types/auth.types";

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<ApiResponse<AuthResult>>("/auth/refresh")
      .then((response) => {
        const result = response.data.data;
        if (!result) throw new Error("Refresh response did not include an access token.");
        useAuthStore.getState().setAuth(result.accessToken, result.user);
        return result.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

axiosClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>;
    response.data = body?.data ?? body;
    return response;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const body = error.response?.data;
    const status = body?.status;
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    // JwtBearer's own challenge is a bare 401 with no ApiResponse body, so key off the HTTP status.
    // Auth endpoints (e.g. an expired cookie on /auth/refresh) return 401 too; let the caller handle those.
    const isAuthCall = originalRequest?.url?.startsWith("/auth/") ?? false;
    const isUnauthorized = error.response?.status === 401 && !isAuthCall;

    if (isUnauthorized && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true;

      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);
        return axiosClient(originalRequest);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = "/login";
        return Promise.reject({
          message: body?.message ?? error.message,
          status: ErrorStatus.UnAuthorized,
          errors: null,
        });
      }
    }

    if (isUnauthorized) {
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
    }

    return Promise.reject({
      message: body?.message ?? error.message,
      status: status ?? ErrorStatus.InternalServerError,
      errors: body?.errors ?? null,
    });
  },
);

export default axiosClient;
