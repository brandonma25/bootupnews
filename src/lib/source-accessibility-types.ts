export type SourceRole =
  | "primary_authoritative"
  | "secondary_authoritative"
  | "context_authority"
  | "primary_institutional"
  | "discovery_only"
  | "corroboration_only"
  | "reference_only"
  | "manual_reference"
  | "blocked_unlicensed";

export type ContentAccessibility =
  | "full_text_available"
  | "partial_text_available"
  | "abstract_only"
  | "metadata_only"
  | "paywall_limited"
  | "fetch_failed"
  | "parser_failed"
  | "rss_retry_exhausted"
  | "unknown";

export type SourceExtractionMethod =
  | "rss_content_encoded"
  | "rss_content"
  | "rss_summary"
  | "api_snippet"
  | "api_description"
  | "tldr_payload"
  | "metadata"
  | "none"
  | "unknown";

export type SourceFetchStatus = "success" | "failed" | "rss_retry_exhausted" | "unknown";
export type SourceParseStatus = "parsed" | "parser_failed" | "not_applicable" | "unknown";
export type SourceTierLabel = "tier1" | "tier2" | "tier3" | "unknown";

export type CandidatePoolInsufficientReason =
  | "source_scarcity"
  | "source_accessibility"
  | "selection_quality"
  | "mixed";

export type SourceAccessibilityDiagnostics = {
  source_role: SourceRole;
  content_accessibility: ContentAccessibility;
  accessible_text_length: number;
  summary_length: number;
  content_length: number;
  extraction_method: SourceExtractionMethod;
  fetch_status: SourceFetchStatus;
  parse_status: SourceParseStatus;
  failure_reason: string | null;
  retry_count: number | null;
  supplied_by_manifest: boolean;
  source_tier: SourceTierLabel;
  public_eligible: boolean;
};

export type SourceAccessibilitySupport = {
  coreSupported: boolean;
  contextSupported: boolean;
  depthSupported: boolean;
  representative: SourceAccessibilityDiagnostics;
  sourceRoles: SourceRole[];
  contentAccessibilityValues: ContentAccessibility[];
  accessibleTextLength: number;
  coreBlockingReasons: string[];
  warnings: string[];
};
