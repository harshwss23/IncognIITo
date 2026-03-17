import { buildApiUrl } from "@/services/config";

const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";

type Tokens = {
  accessToken: string;
  refreshToken?: string | null;
};

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let refreshRequest: Promise<string | null> | null = null;

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) {
    return true;
  }

  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
}

export function setAuthTokens(tokens: Tokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);

  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export function clearAuthTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function ensureValidAccessToken(): Promise<string | null> {
  const accessToken = getAccessToken();
  if (accessToken && !isTokenExpired(accessToken)) {
    return accessToken;
  }

  return refreshAccessToken();
}

function withAuthHeaders(headers: HeadersInit | undefined, accessToken: string | null): Headers {
  const mergedHeaders = new Headers(headers);

  if (accessToken) {
    mergedHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return mergedHeaders;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshRequest) {
    return refreshRequest;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  refreshRequest = (async () => {
    try {
      const response = await fetch(buildApiUrl("/api/auth/refresh"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json().catch(() => null);
      const nextAccessToken = data?.data?.accessToken;

      if (!response.ok || !nextAccessToken) {
        clearAuthTokens();
        return null;
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);
      return nextAccessToken;
    } catch {
      clearAuthTokens();
      return null;
    } finally {
      refreshRequest = null;
    }
  })();

  return refreshRequest;
}

export async function authFetch(path: string, init: RequestInit = {}, retryOnUnauthorized = true): Promise<Response> {
  const request = () =>
    fetch(buildApiUrl(path), {
      ...init,
      headers: withAuthHeaders(init.headers, getAccessToken()),
    });

  const response = await request();

  if (response.status !== 401 || !retryOnUnauthorized) {
    return response;
  }

  const nextAccessToken = await refreshAccessToken();
  if (!nextAccessToken) {
    // If not on an auth-related page, redirect to login
    const publicPaths = ["/api/auth/login", "/api/auth/register", "/api/auth/verify-otp", "/api/auth/forgot-password"];
    const isPublicPath = publicPaths.some(p => path.startsWith(p));

    if (!isPublicPath) {
      clearAuthTokens();
      window.location.href = "/";
    }
    return response;
  }

  return fetch(buildApiUrl(path), {
    ...init,
    headers: withAuthHeaders(init.headers, nextAccessToken),
  });
}

export async function fetchJsonWithAuth<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authFetch(path, init);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Request failed (${response.status})`,
      response.status,
      data
    );
  }

  return data as T;
}