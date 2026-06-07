/**
 * Article-URL filter (Task 2, item D — PRD-13).
 *
 * The newsletter parser and the legacy RSS writer historically harvested
 * `@font-face url(...)` declarations from inline CSS (e.g. Axios webfont
 * assets) and email-tracking redirector links (e.g. Politico
 * `url4027.email.politico.com/ss/c/...`) as if they were candidate article
 * URLs. Migration 20260521120000 deduped the seven rows of damage on
 * 2026-05-17; this module prevents recurrence at the ingest-time validation
 * boundary.
 *
 * `isLikelyArticleUrl` returns false when the URL is **structurally** unlikely
 * to be a human-readable article page: known asset file extensions, known
 * tracking/redirector hostnames, or unsubscribe/preferences paths. It is a
 * cheap predicate, not a fetch — false negatives (rejecting a real article)
 * are acceptable for these patterns because the manifest doesn't include
 * sources that publish at these paths.
 *
 * Counterpart: the Source Health Log records junk rejections so operators
 * can see *which* source is leaking junk URLs into the candidate stream.
 */

/** Lower-cased file extensions that are never an article body. */
const ASSET_EXTENSIONS = new Set([
  // Fonts
  "woff", "woff2", "ttf", "otf", "eot",
  // Stylesheets / scripts / data
  "css", "js", "mjs", "json", "xml", "rss", "atom",
  // Images
  "png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "bmp", "tif", "tiff",
  // Documents / media (real article pages don't end in these)
  "pdf", "zip", "tar", "gz",
  "mp3", "mp4", "m4a", "wav", "ogg", "flac",
  "avi", "mov", "mkv", "webm",
]);

/**
 * Tracking / redirect / link-wrapper host patterns. Each pattern matches when
 * the URL hostname *contains* the substring (case-insensitive). These are
 * email-marketing trackers that wrap the real destination — the link they
 * resolve to may be an article, but the tracker URL itself is opaque, often
 * 1-of-N (so duplicates explode), and may not even open without the right
 * referrer.
 */
const TRACKING_HOST_PATTERNS = [
  "email.politico.com",       // Politico newsletter trackers (url4027.email.politico.com)
  ".sailthru.com",
  ".list-manage.com",         // Mailchimp
  ".lpages.co",               // Leadpages
  ".substackcdn.com/redirect",
  "cl.s2.exct.net",           // Salesforce / ExactTarget
  "click.convertkit-mail",
  "link.mail.beehiiv.com",
  "url.s.tbsfact.com",
  "track.constantcontact.com",
  "click.mailchimpapp.com",
  "ctrk.klclick.com",
  ".rs6.net",                 // Constant Contact wrapper
  ".everestengagement.com",   // 1440 / Everest open-tracker (join1440.everestengagement.com)
];

/**
 * URL path-fragment patterns that indicate a wrapper / utility link rather
 * than a story. Substring match, case-insensitive on the path-and-query.
 */
const NON_ARTICLE_PATH_PATTERNS = [
  "/ss/c/",                   // Sailthru click-wrapper pattern (`/ss/c/<token>/...`)
  "/click/",
  "/redirect",
  "/redir/",
  "/app-link",                // substack.com/app-link/post?… (open-in-app wrapper)
  "/account/newsletters",     // bloomberg.com subscription-management link
  "/unsubscribe",
  "/preferences",
  "/manage-subscription",
  "/email-preferences",
  "/optout",
  "/track?",
  "/track/",
  "/pixel?",
];

/**
 * Hostname patterns that look like marketing-domain subdomains: `email.*`,
 * `url<n>.email.*`, `links.*`, `mail.*` when followed by something other
 * than the publisher root domain. Conservative: only fires when the
 * leading-host token is the literal marker. Tested at runtime by inspecting
 * the URL's `hostname`.
 */
function looksLikeMarketingHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  // url4027.email.politico.com, url123.email.foo.com, etc.
  if (/^url\d+\.email\./.test(lower)) return true;
  // email.something.com (top-level email subdomain)
  if (lower.startsWith("email.")) return true;
  // link.mail.x, links.x, link.x (very common in newsletter wrappers)
  if (/^links?\./.test(lower) && !/^links?\.(yahoo|youtube|linkedin|google)\./.test(lower)) {
    return true;
  }
  // Generic mail.* subdomains for newsletter senders
  if (lower.startsWith("mail.") || lower.startsWith("e.")) return true;
  return false;
}

function getPathExtension(pathname: string): string | null {
  // Strip trailing `/` to ignore directory-style URLs.
  const trimmed = pathname.replace(/\/+$/u, "");
  const lastSegment = trimmed.split("/").pop() ?? "";
  const lastDot = lastSegment.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === lastSegment.length - 1) return null;
  return lastSegment.slice(lastDot + 1).toLowerCase();
}

export type UrlRejectionReason =
  | "asset_extension"
  | "tracking_host"
  | "marketing_hostname"
  | "non_article_path"
  | "invalid_url"
  | "non_http_protocol";

/**
 * Predicate: is the URL plausibly a fetchable article page?
 *
 * Returns true for normal article-shaped URLs. Returns false for asset URLs
 * (`*.woff2`, `*.png`, `*.pdf`, …), known tracking/redirector hostnames, and
 * obvious utility paths (`/unsubscribe`, `/ss/c/…`, …).
 *
 * Designed to be cheap: pure string/URL inspection, no fetch.
 */
export function isLikelyArticleUrl(value: string | null | undefined): boolean {
  return classifyUrlForArticleEligibility(value).ok;
}

export type UrlEligibilityResult =
  | { ok: true; url: URL }
  | { ok: false; reason: UrlRejectionReason; detail: string };

/**
 * Same logic as `isLikelyArticleUrl`, but returns the specific rejection
 * reason and a short detail string. Used by the newsletter parser and the
 * Source Health junk-rejection telemetry path.
 */
export function classifyUrlForArticleEligibility(
  value: string | null | undefined,
): UrlEligibilityResult {
  const raw = value?.trim() ?? "";
  if (!raw) return { ok: false, reason: "invalid_url", detail: "empty" };

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "invalid_url", detail: raw.slice(0, 80) };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "non_http_protocol", detail: parsed.protocol };
  }

  const ext = getPathExtension(parsed.pathname);
  if (ext && ASSET_EXTENSIONS.has(ext)) {
    return { ok: false, reason: "asset_extension", detail: ext };
  }

  const hostnameLower = parsed.hostname.toLowerCase();
  for (const pattern of TRACKING_HOST_PATTERNS) {
    if (hostnameLower.includes(pattern)) {
      return { ok: false, reason: "tracking_host", detail: pattern };
    }
  }

  if (looksLikeMarketingHostname(hostnameLower)) {
    return { ok: false, reason: "marketing_hostname", detail: hostnameLower };
  }

  const pathAndQueryLower = (parsed.pathname + parsed.search).toLowerCase();
  for (const pattern of NON_ARTICLE_PATH_PATTERNS) {
    if (pathAndQueryLower.includes(pattern)) {
      return { ok: false, reason: "non_article_path", detail: pattern };
    }
  }

  return { ok: true, url: parsed };
}

/**
 * Summary row for telemetry. Used by the newsletter promotion path to emit a
 * single Source Health entry per source per run capturing how many junk URLs
 * were rejected and why.
 */
export type JunkRejection = {
  url: string;
  reason: UrlRejectionReason;
  detail: string;
};

export function summarizeJunkRejections(
  rejections: JunkRejection[],
): { count: number; byReason: Record<UrlRejectionReason, number> } {
  const byReason: Record<UrlRejectionReason, number> = {
    asset_extension: 0,
    tracking_host: 0,
    marketing_hostname: 0,
    non_article_path: 0,
    invalid_url: 0,
    non_http_protocol: 0,
  };
  for (const rejection of rejections) {
    byReason[rejection.reason] += 1;
  }
  return { count: rejections.length, byReason };
}
