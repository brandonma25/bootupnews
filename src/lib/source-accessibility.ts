import type { SourceDefinition } from "@/lib/integration/subsystem-contracts";
import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { FeedArticle } from "@/lib/rss";
import type {
  ContentAccessibility,
  SourceAccessibilityDiagnostics,
  SourceAccessibilitySupport,
  SourceExtractionMethod,
  SourceFetchStatus,
  SourceParseStatus,
  SourceRole,
  SourceTierLabel,
} from "@/lib/source-accessibility-types";
import { cleanText } from "@/lib/pipeline/shared/text";

const FULL_TEXT_THRESHOLD = 1_200;
const SUBSTANTIAL_PARTIAL_THRESHOLD = 500;
const SUBSTANTIAL_ABSTRACT_THRESHOLD = 800;
const CONTEXT_PARTIAL_THRESHOLD = 300;
const CONTEXT_ABSTRACT_THRESHOLD = 500;
const DEPTH_TEXT_THRESHOLD = 120;

const PAYWALL_LIMITED_HOSTS = [
  "ft.com",
  "bloomberg.com",
  "wsj.com",
  "economist.com",
  "theinformation.com",
  "stratechery.com",
  "puck.news",
];

const CORE_SUPPORTING_ROLES = new Set<SourceRole>([
  "primary_authoritative",
  "secondary_authoritative",
  "context_authority",
  "primary_institutional",
]);

const PUBLIC_BLOCKED_ROLES = new Set<SourceRole>([
  "blocked_unlicensed",
  "discovery_only",
  "reference_only",
  "manual_reference",
]);

function isNonEmpty(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}

export function normalizeSourceTier(value: string | null | undefined): SourceTierLabel {
  if (value === "tier_1" || value === "tier1") return "tier1";
  if (value === "tier_2" || value === "tier2") return "tier2";
  if (value === "tier_3" || value === "tier3") return "tier3";
  return "unknown";
}

export function inferSourceRole(input: {
  explicitRole?: SourceRole | null;
  sourceClass?: string | null;
  trustTier?: string | null;
  provenance?: string | null;
  publicEligible?: boolean | null;
}): SourceRole {
  if (input.explicitRole) {
    return input.explicitRole;
  }

  if (input.publicEligible === false) {
    return "reference_only";
  }

  const tier = normalizeSourceTier(input.trustTier);

  if (input.sourceClass === "global_wire" && tier === "tier1") {
    return "primary_authoritative";
  }

  if (input.provenance === "primary_reporting" && tier === "tier1") {
    return "primary_authoritative";
  }

  if (input.sourceClass === "business_press" && tier === "tier1") {
    return "primary_authoritative";
  }

  if (tier === "tier1" || tier === "tier2") {
    return "secondary_authoritative";
  }

  return "discovery_only";
}

function sourceHost(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function isPaywallLimitedSource(source: SourceDefinition, articleUrl: string) {
  const hostCandidates = [
    sourceHost(articleUrl),
    sourceHost(source.homepageUrl),
    sourceHost(source.fetch.feedUrl),
  ];

  return hostCandidates.some((host) =>
    PAYWALL_LIMITED_HOSTS.some((paywallHost) => host === paywallHost || host.endsWith(`.${paywallHost}`)),
  );
}

function isTitleOnlySummary(summary: string, title: string) {
  if (!summary || !title) {
    return false;
  }

  return summary.trim().toLowerCase() === title.trim().toLowerCase();
}

function classifySuccessfulAccessibility(input: {
  title: string;
  summaryText: string;
  contentText: string;
  extractionMethod: SourceExtractionMethod;
  source: SourceDefinition;
  url: string;
}): {
  contentAccessibility: ContentAccessibility;
  accessibleTextLength: number;
  summaryLength: number;
  contentLength: number;
} {
  const title = cleanText(input.title);
  const content = cleanText(input.contentText);
  const summary = cleanText(input.summaryText);
  const contentLength = content.length;
  const summaryLength = isTitleOnlySummary(summary, title) ? 0 : summary.length;
  const accessibleTextLength = Math.max(contentLength, summaryLength);
  const paywallLimited = isPaywallLimitedSource(input.source, input.url) && contentLength < SUBSTANTIAL_PARTIAL_THRESHOLD;

  if (contentLength >= FULL_TEXT_THRESHOLD) {
    return {
      contentAccessibility: "full_text_available",
      accessibleTextLength,
      summaryLength,
      contentLength,
    };
  }

  if (contentLength >= SUBSTANTIAL_PARTIAL_THRESHOLD) {
    return {
      contentAccessibility: "partial_text_available",
      accessibleTextLength,
      summaryLength,
      contentLength,
    };
  }

  if (paywallLimited && accessibleTextLength > 0) {
    return {
      contentAccessibility: "paywall_limited",
      accessibleTextLength,
      summaryLength,
      contentLength,
    };
  }

  if (contentLength > 0) {
    return {
      contentAccessibility: "partial_text_available",
      accessibleTextLength,
      summaryLength,
      contentLength,
    };
  }

  if (summaryLength > 0) {
    return {
      contentAccessibility: "abstract_only",
      accessibleTextLength,
      summaryLength,
      contentLength,
    };
  }

  if (title.length > 0) {
    return {
      contentAccessibility: "metadata_only",
      accessibleTextLength: 0,
      summaryLength,
      contentLength,
    };
  }

  return {
    contentAccessibility: "unknown",
    accessibleTextLength: 0,
    summaryLength: 0,
    contentLength: 0,
  };
}

function baseSourceDiagnostics(source: SourceDefinition): Pick<
  SourceAccessibilityDiagnostics,
  "source_role" | "source_tier" | "supplied_by_manifest" | "public_eligible"
> {
  const sourceRole = inferSourceRole({
    explicitRole: source.sourceRole ?? null,
    sourceClass: source.sourceClass,
    trustTier: source.trustTier,
    provenance: source.provenance,
    publicEligible: source.publicEligible ?? true,
  });

  return {
    source_role: sourceRole,
    source_tier: normalizeSourceTier(source.trustTier),
    supplied_by_manifest: Boolean(source.suppliedByManifest),
    public_eligible: source.publicEligible ?? true,
  };
}

export function buildArticleSourceAccessibility(
  article: FeedArticle,
  source: SourceDefinition,
): SourceAccessibilityDiagnostics {
  const contentText = cleanText(article.contentText ?? "");
  const summaryText = cleanText(article.summaryText ?? "");
  const extractionMethod = article.extractionMethod ?? (
    contentText ? "rss_content" : summaryText ? "rss_summary" : "metadata"
  );
  const classification = classifySuccessfulAccessibility({
    title: article.title,
    summaryText,
    contentText,
    extractionMethod,
    source,
    url: article.url,
  });

  return {
    ...baseSourceDiagnostics(source),
    content_accessibility: classification.contentAccessibility,
    accessible_text_length: classification.accessibleTextLength,
    summary_length: classification.summaryLength,
    content_length: classification.contentLength,
    extraction_method: extractionMethod,
    fetch_status: "success",
    parse_status: "parsed",
    failure_reason: null,
    retry_count: source.fetch.retryCount ?? null,
  };
}

export function buildFailedSourceAccessibility(input: {
  source: SourceDefinition;
  failureType?: string | null;
  error: string;
}): SourceAccessibilityDiagnostics {
  const failureType = input.failureType ?? "";
  const retryExhausted = failureType === "rss_retry_exhausted" || /retry exhausted/i.test(input.error);
  const parserFailed = /^rss_parse_/i.test(failureType);
  const contentAccessibility: ContentAccessibility = retryExhausted
    ? "rss_retry_exhausted"
    : parserFailed
      ? "parser_failed"
      : "fetch_failed";
  const fetchStatus: SourceFetchStatus = retryExhausted ? "rss_retry_exhausted" : "failed";
  const parseStatus: SourceParseStatus = parserFailed ? "parser_failed" : "not_applicable";

  return {
    ...baseSourceDiagnostics(input.source),
    content_accessibility: contentAccessibility,
    accessible_text_length: 0,
    summary_length: 0,
    content_length: 0,
    extraction_method: "none",
    fetch_status: fetchStatus,
    parse_status: parseStatus,
    failure_reason: input.error,
    retry_count: input.source.fetch.retryCount ?? null,
  };
}

function isPublicEvidence(diagnostics: SourceAccessibilityDiagnostics) {
  return diagnostics.public_eligible && !PUBLIC_BLOCKED_ROLES.has(diagnostics.source_role);
}

function canRoleSupportCore(diagnostics: SourceAccessibilityDiagnostics) {
  return isPublicEvidence(diagnostics) && CORE_SUPPORTING_ROLES.has(diagnostics.source_role);
}

function sourceKey(article: NormalizedArticle) {
  return article.source_metadata?.sourceId ?? article.source;
}

function hasFullTextCoreSupport(diagnostics: SourceAccessibilityDiagnostics) {
  return diagnostics.content_accessibility === "full_text_available" && canRoleSupportCore(diagnostics);
}

function hasSubstantialPartialCoreSupport(diagnostics: SourceAccessibilityDiagnostics) {
  return (
    diagnostics.content_accessibility === "partial_text_available" &&
    diagnostics.accessible_text_length >= SUBSTANTIAL_PARTIAL_THRESHOLD &&
    canRoleSupportCore(diagnostics)
  );
}

function hasSubstantialAbstractCoreSupport(diagnostics: SourceAccessibilityDiagnostics) {
  return (
    (diagnostics.content_accessibility === "abstract_only" || diagnostics.content_accessibility === "paywall_limited") &&
    diagnostics.accessible_text_length >= SUBSTANTIAL_ABSTRACT_THRESHOLD &&
    canRoleSupportCore(diagnostics)
  );
}

function hasContextSupport(diagnostics: SourceAccessibilityDiagnostics) {
  if (!isPublicEvidence(diagnostics)) {
    return false;
  }

  if (hasFullTextCoreSupport(diagnostics) || hasSubstantialPartialCoreSupport(diagnostics)) {
    return true;
  }

  if (
    diagnostics.content_accessibility === "partial_text_available" &&
    diagnostics.accessible_text_length >= CONTEXT_PARTIAL_THRESHOLD
  ) {
    return true;
  }

  if (
    (diagnostics.content_accessibility === "abstract_only" || diagnostics.content_accessibility === "paywall_limited") &&
    diagnostics.accessible_text_length >= CONTEXT_ABSTRACT_THRESHOLD
  ) {
    return true;
  }

  return false;
}

function hasDepthSupport(diagnostics: SourceAccessibilityDiagnostics) {
  if (!isPublicEvidence(diagnostics)) {
    return false;
  }

  if (hasContextSupport(diagnostics)) {
    return true;
  }

  return (
    (diagnostics.content_accessibility === "abstract_only" ||
      diagnostics.content_accessibility === "paywall_limited" ||
      diagnostics.content_accessibility === "partial_text_available") &&
    diagnostics.accessible_text_length >= DEPTH_TEXT_THRESHOLD
  );
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function buildCoreBlockingReasons(diagnostics: SourceAccessibilityDiagnostics[]) {
  const reasons: string[] = [];

  if (diagnostics.length === 0) {
    return ["source_accessibility_insufficient"];
  }

  if (diagnostics.some((entry) => entry.content_accessibility === "rss_retry_exhausted")) {
    reasons.push("source_fetch_failed", "rss_retry_exhausted");
  } else if (diagnostics.some((entry) => entry.content_accessibility === "fetch_failed")) {
    reasons.push("source_fetch_failed");
  }

  if (diagnostics.some((entry) => entry.content_accessibility === "parser_failed")) {
    reasons.push("parser_failed");
  }

  if (diagnostics.every((entry) => entry.content_accessibility === "metadata_only")) {
    reasons.push("metadata_only");
  }

  if (
    diagnostics.some((entry) => entry.content_accessibility === "abstract_only") &&
    !diagnostics.some(hasFullTextCoreSupport) &&
    !diagnostics.some(hasSubstantialPartialCoreSupport)
  ) {
    reasons.push("abstract_only_uncorroborated");
  }

  if (
    diagnostics.some((entry) => entry.content_accessibility === "paywall_limited") &&
    !diagnostics.some(hasFullTextCoreSupport) &&
    !diagnostics.some(hasSubstantialPartialCoreSupport)
  ) {
    reasons.push("paywall_limited_uncorroborated");
  }

  if (diagnostics.some((entry) => entry.content_accessibility === "unknown")) {
    reasons.push("source_accessibility_unknown");
  }

  if (diagnostics.some((entry) => !entry.public_eligible || PUBLIC_BLOCKED_ROLES.has(entry.source_role))) {
    reasons.push("source_role_not_public_evidence");
  }

  if (reasons.length === 0) {
    reasons.push("source_accessibility_insufficient");
  }

  return unique(reasons);
}

export function evaluateSourceAccessibilitySupport(articles: NormalizedArticle[]): SourceAccessibilitySupport {
  const diagnostics = articles
    .map((article) => article.source_accessibility)
    .filter((value): value is SourceAccessibilityDiagnostics => Boolean(value));
  const representative = diagnostics[0] ?? {
    source_role: "discovery_only",
    content_accessibility: "unknown",
    accessible_text_length: 0,
    summary_length: 0,
    content_length: 0,
    extraction_method: "unknown",
    fetch_status: "unknown",
    parse_status: "unknown",
    failure_reason: null,
    retry_count: null,
    supplied_by_manifest: false,
    source_tier: "unknown",
    public_eligible: false,
  };
  const authoritativeDiagnostics = diagnostics.filter(canRoleSupportCore);
  const fullTextCore = diagnostics.some(hasFullTextCoreSupport);
  const substantialPartialCore = diagnostics.some(hasSubstantialPartialCoreSupport);
  const substantialAbstractCore = diagnostics.some(hasSubstantialAbstractCoreSupport);
  const partialAuthoritativeSources = new Set(
    articles
      .filter((article) => {
        const diagnosticsForArticle = article.source_accessibility;
        return (
          diagnosticsForArticle &&
          canRoleSupportCore(diagnosticsForArticle) &&
          diagnosticsForArticle.content_accessibility === "partial_text_available" &&
          diagnosticsForArticle.accessible_text_length >= CONTEXT_PARTIAL_THRESHOLD
        );
      })
      .map(sourceKey),
  );
  const combinedPartialLength = authoritativeDiagnostics
    .filter((entry) => entry.content_accessibility === "partial_text_available")
    .reduce((sum, entry) => sum + entry.accessible_text_length, 0);
  const corroboratedPartialCore =
    partialAuthoritativeSources.size >= 2 && combinedPartialLength >= SUBSTANTIAL_ABSTRACT_THRESHOLD;
  const coreSupported = fullTextCore || substantialPartialCore || substantialAbstractCore || corroboratedPartialCore;
  const contextSupported = coreSupported || diagnostics.some(hasContextSupport);
  const depthSupported = contextSupported || diagnostics.some(hasDepthSupport);
  const warnings = unique([
    diagnostics.some((entry) =>
      entry.content_accessibility === "abstract_only" ||
      entry.content_accessibility === "metadata_only" ||
      entry.content_accessibility === "paywall_limited"
    )
      ? "source_accessibility_thin"
      : null,
    diagnostics.some((entry) => entry.fetch_status === "failed" || entry.fetch_status === "rss_retry_exhausted")
      ? "source_health_warning"
      : null,
  ].filter(isNonEmpty));

  return {
    coreSupported,
    contextSupported,
    depthSupported,
    representative,
    sourceRoles: unique(diagnostics.map((entry) => entry.source_role)),
    contentAccessibilityValues: unique(diagnostics.map((entry) => entry.content_accessibility)),
    accessibleTextLength: Math.max(0, ...diagnostics.map((entry) => entry.accessible_text_length)),
    coreBlockingReasons: coreSupported ? [] : buildCoreBlockingReasons(diagnostics),
    warnings,
  };
}

export function summarizeSourceAccessibility(input: {
  source: SourceDefinition;
  diagnostics: SourceAccessibilityDiagnostics[];
  failure?: SourceAccessibilityDiagnostics | null;
}) {
  const fallback = input.failure ?? buildFailedSourceAccessibility({
    source: input.source,
    error: "source_returned_no_articles",
    failureType: "fetch_failed",
  });
  const diagnostics = input.diagnostics.length > 0 ? input.diagnostics : [fallback];
  const support = evaluateSourceAccessibilitySupport(
    diagnostics.map((entry, index) => ({
      id: `${input.source.sourceId}-${index}`,
      title: input.source.source,
      source: input.source.source,
      url: input.source.homepageUrl,
      published_at: new Date(0).toISOString(),
      content: "",
      entities: [],
      normalized_entities: [],
      keywords: [],
      title_tokens: [],
      content_tokens: [],
      source_metadata: input.source,
      source_accessibility: entry,
    })),
  );
  const representative = support.representative;

  return {
    source_role: representative.source_role,
    content_accessibility: representative.content_accessibility,
    accessible_text_length_max: support.accessibleTextLength,
    extraction_method: representative.extraction_method,
    fetch_status: representative.fetch_status,
    parse_status: representative.parse_status,
    failure_reason: representative.failure_reason,
    public_eligible: representative.public_eligible,
    functional_for_core: support.coreSupported,
    functional_for_context: support.contextSupported,
    functional_for_depth: support.depthSupported,
    accessibility_warnings: support.warnings,
    core_blocking_reasons: support.coreBlockingReasons,
  };
}
