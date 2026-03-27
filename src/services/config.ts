const defaultApiBaseUrl = "https://172.27.16.252:5174/";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const apiBaseUrl = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl
);

export const socketUrl = trimTrailingSlash(
  import.meta.env.VITE_SOCKET_URL ?? apiBaseUrl
);

export const buildApiUrl = (path: string) =>
  `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
