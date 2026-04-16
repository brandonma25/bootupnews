import { env } from "@/lib/env";

export const AUTH_CONFIG_ERROR = "config-error";
export const DEFAULT_AUTH_NEXT_PATH = "/dashboard";
const AUTH_RETURN_PARAMS = ["code", "token_hash", "type", "state"];

export function safeRedirectPath(value: string | null | undefined, fallback = DEFAULT_AUTH_NEXT_PATH) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim();

  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return fallback;
  }

  return normalized;
}

export function buildAuthRedirectPath(path: string, authState: string) {
  const [pathWithoutHash, hash = ""] = path.split("#", 2);
  const url = new URL(pathWithoutHash || "/", "http://localhost");

  url.searchParams.set("auth", authState);

  return `${url.pathname}${url.search}${hash ? `#${hash}` : ""}`;
}

export function buildAuthConfigErrorPath(path = "/#email-access") {
  return buildAuthRedirectPath(path, AUTH_CONFIG_ERROR);
}

export function buildAuthCallbackUrl({
  next = DEFAULT_AUTH_NEXT_PATH,
  origin,
}: {
  next?: string;
  origin?: string;
}) {
  const normalizedNext = safeRedirectPath(next);
  const normalizedOrigin = origin?.trim() || env.appUrl;

  return `${normalizedOrigin}/auth/callback?next=${encodeURIComponent(normalizedNext)}`;
}

export function hasSupabaseSessionCookie(cookies: Array<{ name: string }>) {
  return cookies.some(
    (cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
  );
}

export function hasAuthReturnParams(searchParams: URLSearchParams) {
  return AUTH_RETURN_PARAMS.some((name) => searchParams.has(name));
}

export function buildAuthReturnNextPath(url: URL) {
  const nextUrl = new URL(url.pathname || "/", "http://localhost");

  url.searchParams.forEach((value, key) => {
    if (!AUTH_RETURN_PARAMS.includes(key) && key !== "next") {
      nextUrl.searchParams.set(key, value);
    }
  });

  const path = `${nextUrl.pathname}${nextUrl.search}`;
  return safeRedirectPath(path === "/" ? DEFAULT_AUTH_NEXT_PATH : path);
}

export function buildAuthCallbackExchangeUrl(url: URL) {
  const callbackUrl = new URL("/auth/callback", url.origin);

  url.searchParams.forEach((value, key) => {
    if (AUTH_RETURN_PARAMS.includes(key)) {
      callbackUrl.searchParams.set(key, value);
    }
  });

  callbackUrl.searchParams.set("next", buildAuthReturnNextPath(url));

  return callbackUrl;
}
