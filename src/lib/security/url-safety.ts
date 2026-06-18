import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

/**
 * SSRF guard for outbound fetches of user-influenced URLs (RSS feeds, article
 * bodies). Three layers:
 *   1. validatePublicUrl(): sync — scheme allowlist (http/https only), reject
 *      embedded credentials, reject literal private/loopback/link-local/IMDS IPs
 *      and internal hostnames (localhost, *.local, *.internal, metadata hosts).
 *   2. assertHostnameResolvesPublic(): async — DNS-resolve the hostname and block
 *      if ANY resolved address is private/reserved (catches a public-looking name
 *      that resolves to an internal IP).
 *   3. safeFetch(): redirect:"manual" + re-run (1)+(2) on every hop, so a 30x to
 *      an internal address can't bypass the guard.
 *
 * Residual: a narrow DNS-rebinding TOCTOU remains between the resolve check and
 * undici's own connect-time resolution. Closing it fully needs a connect-time IP
 * pin (custom undici dispatcher `lookup`); tracked as follow-up. This guard blocks
 * every documented exploit (169.254.169.254, localhost, RFC1918, file://, 302->internal).
 */

export type UrlSafetyReason =
  | "invalid_url"
  | "unsupported_scheme"
  | "embedded_credentials"
  | "internal_hostname"
  | "private_ip"
  | "too_many_redirects";

export class SsrfBlockedError extends Error {
  readonly reason: UrlSafetyReason;
  readonly url: string;

  constructor(reason: UrlSafetyReason, url: string) {
    super(`Blocked potentially-internal URL (${reason}): ${url}`);
    this.name = "SsrfBlockedError";
    this.reason = reason;
    this.url = url;
  }
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_HOSTNAME_SUFFIXES = [".local", ".internal", ".localhost"];
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
]);

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function inCidr(ipInt: number, baseIp: string, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (ipv4ToInt(baseIp) & mask);
}

// RFC1918 + loopback + link-local (incl. AWS/GCP IMDS 169.254.169.254) + CGNAT
// + unspecified + reserved/multicast/broadcast.
const BLOCKED_V4_CIDRS: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function isBlockedIpv4(ip: string): boolean {
  const asInt = ipv4ToInt(ip);
  return BLOCKED_V4_CIDRS.some(([base, prefix]) => inCidr(asInt, base, prefix));
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "::1" || normalized === "::") return true;
  // IPv4-mapped, dotted form (::ffff:127.0.0.1) — extract and re-check as v4.
  const mappedDotted = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedDotted) return isBlockedIpv4(mappedDotted[1]!);
  // IPv4-mapped, hex form (URL normalizes ::ffff:127.0.0.1 -> ::ffff:7f00:1).
  const mappedHex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const high = Number.parseInt(mappedHex[1]!, 16);
    const low = Number.parseInt(mappedHex[2]!, 16);
    return isBlockedIpv4(`${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`);
  }
  // fc00::/7 ULA, fe80::/10 link-local.
  if (/^f[cd]/.test(normalized)) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return false;
}

export type UrlSafetyResult = { ok: true; url: URL } | { ok: false; reason: UrlSafetyReason };

/**
 * SYNC validation — scheme, credentials, and literal-IP / internal-hostname
 * checks. Does NOT do DNS (use assertHostnameResolvesPublic / safeFetch for that).
 */
export function validatePublicUrl(rawUrl: string): UrlSafetyResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, reason: "unsupported_scheme" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "embedded_credentials" };
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname) {
    return { ok: false, reason: "internal_hostname" };
  }
  if (BLOCKED_HOSTNAMES.has(hostname) || BLOCKED_HOSTNAME_SUFFIXES.some((s) => hostname.endsWith(s))) {
    return { ok: false, reason: "internal_hostname" };
  }

  // Literal IP host (incl. bracketed IPv6) — check directly, no DNS needed.
  const literal = hostname.replace(/^\[|\]$/g, "");
  if (isIP(literal) && isBlockedIp(literal)) {
    return { ok: false, reason: "private_ip" };
  }

  return { ok: true, url };
}

export function isSafePublicUrl(rawUrl: string): boolean {
  return validatePublicUrl(rawUrl).ok;
}

/** DNS-resolve the hostname and throw if any resolved address is private/reserved. */
export async function assertHostnameResolvesPublic(hostname: string, rawUrl: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    // Already a literal — validatePublicUrl covered it.
    return;
  }
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    // Unresolvable host — let the actual fetch fail normally (not an SSRF signal).
    return;
  }
  if (addresses.some((entry) => isBlockedIp(entry.address))) {
    throw new SsrfBlockedError("private_ip", rawUrl);
  }
}

/** Throws SsrfBlockedError if the URL is not a safe public http(s) target. */
export async function assertSafeToFetch(rawUrl: string): Promise<URL> {
  const result = validatePublicUrl(rawUrl);
  if (!result.ok) {
    throw new SsrfBlockedError(result.reason, rawUrl);
  }
  await assertHostnameResolvesPublic(result.url.hostname, rawUrl);
  return result.url;
}

export type SafeFetchOptions = { maxRedirects?: number };

/**
 * fetch() hardened against SSRF: validates + DNS-checks the target and EVERY
 * redirect hop (redirect:"manual"), so a public URL cannot 30x into the internal
 * network. Drop-in for the feed/article fetch sinks.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  options: SafeFetchOptions = {},
): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? 5;
  let currentUrl = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    await assertSafeToFetch(currentUrl);

    const response = await fetch(currentUrl, { ...init, redirect: "manual" });

    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get("location");
    if (!isRedirect || !location) {
      return response;
    }

    // Resolve the next hop relative to the current URL and re-validate it.
    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new SsrfBlockedError("too_many_redirects", rawUrl);
}
