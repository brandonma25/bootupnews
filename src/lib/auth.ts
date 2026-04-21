import { env } from "@/lib/env";

export const AUTH_CONFIG_ERROR = "config-error";
export const DEFAULT_AUTH_NEXT_PATH = "/";
const AUTH_RETURN_PARAMS = ["code", "token_hash", "type", "state"];
const AUTH_ENTRY_PATHS = new Set([
  "/auth/callback",
  "/auth/password",
  "/forgot-password",
  "/login",
  "/reset-password",
  "/signup",
]);

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

export function safePostAuthRedirectPath(value: string | null | undefined, fallback = DEFAULT_AUTH_NEXT_PATH) {
  const normalized = safeRedirectPath(value, fallback);
  const pathname = normalized.split(/[?#]/, 1)[0] || fallback;

  return AUTH_ENTRY_PATHS.has(pathname) ? fallback : normalized;
}

export function buildAuthRedirectPath(path: string, authState: string) {
  const [pathWithoutHash, hash = ""] = path.split("#", 2);
  const url = new URL(pathWithoutHash || "/", "http://localhost");

  url.searchParams.set("auth", authState);

  return `${url.pathname}${url.search}${hash ? `#${hash}` : ""}`;
}

export function buildAuthConfigErrorPath(path = "/") {
  return buildAuthRedirectPath(path, AUTH_CONFIG_ERROR);
}

export function buildAuthCallbackUrl({
  next = DEFAULT_AUTH_NEXT_PATH,
  origin,
}: {
  next?: string;
  origin?: string;
}) {
  const normalizedNext = safePostAuthRedirectPath(next);
  const normalizedOrigin = origin?.trim() || env.appUrl;

  return `${normalizedOrigin}/auth/callback?next=${encodeURIComponent(normalizedNext)}`;
}

export function resolveRequestOrigin({
  origin,
  forwardedHost,
  forwardedProto,
  host,
}: {
  origin?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
}) {
  const normalizedOrigin = origin?.trim();
  if (normalizedOrigin) {
    return normalizedOrigin;
  }

  const normalizedHost = forwardedHost?.trim() || host?.trim();
  if (!normalizedHost) {
    return env.appUrl;
  }

  const normalizedProto = forwardedProto?.trim() || "https";
  return `${normalizedProto}://${normalizedHost}`;
}

export function hasSupabaseSessionCookie(cookies: Array<{ name: string }>) {
  return cookies.some(
    (cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
  );
}

export function hasSupabaseCodeVerifierCookie(cookies: Array<{ name: string }>) {
  return cookies.some(
    (cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token-code-verifier"),
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
