import type {
  ExplanationPacket,
  TrustLayerDebug,
} from "@/lib/integration/subsystem-contracts";
import type { HomepageCategoryClassification } from "@/lib/homepage-taxonomy";
import type { SignalRole } from "@/lib/output-sanity";
import type { EditorialWhyItMattersContent } from "@/lib/editorial-content";
import type { WhyItMattersValidationResult } from "@/lib/why-it-matters-quality-gate";
import type {
  ContentAccessibility,
  SourceExtractionMethod,
  SourceFetchStatus,
  SourceParseStatus,
  SourceRole,
} from "@/lib/source-accessibility-types";

export type Topic = {
  id: string;
  userId?: string;
  name: string;
  description: string;
  color: string;
  keywords?: string[];
  excludeKeywords?: string[];
  createdAt?: string;
};

export type Source = {
  id: string;
  userId?: string;
  name: string;
  feedUrl: string;
  homepageUrl?: string;
  topicId?: string;
  topicName?: string;
  status: "active" | "paused";
  createdAt?: string;
};

export type Article = {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  summaryText: string;
  publishedAt: string;
  topicIds: string[];
};

export type RelatedArticle = {
  title: string;
  url: string;
  sourceName: string;
};

export type TimelineEntry = {
  title: string;
  summary: string;
  source: string;
  publishedAt?: string;
  url?: string;
};

export type TimelineGroup = {
  dateKey: string;
  dateLabel: string;
  entries: TimelineEntry[];
};

export type EventIntelligenceSignals = {
  articleCount: number;
  sourceDiversity: number;
  recencyScore: number;
  velocityScore: number;
};

export type EventTimeHorizon = "short" | "medium" | "long";
export type EventSignalStrength = "weak" | "moderate" | "strong";

export type EventIntelligence = {
  id: string;
  title: string;
  summary: string;
  primaryChange: string;
  entities: string[];
  sourceNames?: string[];
  eventType: string;
  primaryImpact: string;
  affectedMarkets: string[];
  timeHorizon: EventTimeHorizon;
  signalStrength: EventSignalStrength;
  keyEntities: string[];
  topics: string[];
  signals: EventIntelligenceSignals;
  rankingScore: number;
  rankingReason: string;
  confidenceScore: number;
  isHighSignal: boolean;
  createdAt: string;
};

export type EventDisplayState = "new" | "changed" | "escalated" | "unchanged";
export type EditorialStatus = "draft" | "needs_review" | "approved" | "published";
export type SignalSelectionEligibilityTier =
  | "core_signal_eligible"
  | "context_signal_eligible"
  | "depth_only"
  | "exclude_from_public_candidates";

export type SignalSelectionEligibility = {
  tier: SignalSelectionEligibilityTier;
  reasons: string[];
  warnings: string[];
  filterDecision?: "pass" | "suppress" | "reject";
  filterSeverity?: "pass" | "suppress" | "reject";
  filterReasons?: string[];
  sourceTier?: string;
  sourceRole?: SourceRole;
  contentAccessibility?: ContentAccessibility;
  accessibleTextLength?: number;
  extractionMethod?: SourceExtractionMethod;
  fetchStatus?: SourceFetchStatus;
  parseStatus?: SourceParseStatus;
  sourceAccessibilityWarnings?: string[];
  coreBlockingReasons?: string[];
  calibratedReasonLabels?: string[];
  exclusionCause?: string | null;
  headlineQuality?: string;
  eventType?: string;
  structuralImportanceScore?: number;
  sourceQualityScore?: number;
  finalScore?: number;
  scoreComponents?: {
    credibility?: number;
    novelty?: number;
    urgency?: number;
    reinforcement?: number;
    trust_timeliness?: number;
    event_importance?: number;
    support_and_novelty?: number;
    importance_adjustment?: number;
  };
  rankingProvider?: string | null;
  diversityProvider?: string | null;
};

/**
 * MVP compatibility/view-model payload used by briefing, editorial, and card
 * rendering paths. This can contain ranked Story Cluster evidence, editorial
 * metadata, and Card fields, but it is not canonical Signal identity.
 */
export type BriefingItem = {
  id: string;
  topicId: string;
  topicName: string;
  title: string;
  whatHappened: string;
  keyPoints: [string, string, string];
  whyItMatters: string;
  aiWhyItMatters?: string;
  whyItMattersValidation?: WhyItMattersValidationResult;
  editedWhyItMatters?: string | null;
  publishedWhyItMatters?: string | null;
  editedWhyItMattersStructured?: EditorialWhyItMattersContent | null;
  publishedWhyItMattersStructured?: EditorialWhyItMattersContent | null;
  editorialWhyItMatters?: EditorialWhyItMattersContent | null;
  editorialStatus?: EditorialStatus;
  editedBy?: string | null;
  editedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  sources: Array<{ title: string; url: string }>;
  estimatedMinutes: number;
  read: boolean;
  priority: "top" | "normal";
  matchedKeywords?: string[];
  matchScore?: number;
  publishedAt?: string;
  sourceCount?: number;
  relatedArticles?: RelatedArticle[];
  timeline?: TimelineGroup[];
  importanceScore?: number;
  importanceLabel?: "Critical" | "High" | "Watch";
  /** Display/ranking evidence labels for cards; not canonical Signal objects. */
  rankingSignals?: string[];
  eventIntelligence?: EventIntelligence;
  explanationPacket?: ExplanationPacket;
  trustDebug?: TrustLayerDebug;
  homepageClassification?: HomepageCategoryClassification;
  signalRole?: SignalRole;
  selectionEligibility?: SignalSelectionEligibility;
  displayState?: EventDisplayState;
  continuityKey?: string;
  continuityFingerprint?: string;
  lastViewedAt?: string;
};

export type ReadingWindowIntensity = "Light" | "Normal" | "Heavy";

export type ReadingWindowMetrics = {
  totalMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
  progressRatio: number;
  progressLabel: string;
  deltaVsYesterday: number | null;
  intensity: ReadingWindowIntensity;
};

export type DailyBriefing = {
  id: string;
  briefingDate: string;
  title: string;
  intro: string;
  readingWindow: string;
  items: BriefingItem[];
  sessionSummary?: {
    reviewedCount: number;
    newCount: number;
    changedCount: number;
    escalatedCount: number;
  };
  readingMetrics?: ReadingWindowMetrics;
};

export type DashboardData = {
  mode: "demo" | "live" | "public";
  briefing: DailyBriefing;
  topics: Topic[];
  sources: Source[];
  publicRankedItems?: BriefingItem[];
  homepageFreshnessNotice?: {
    kind: "stale" | "empty";
    text: string;
    briefingDate?: string | null;
  };
  homepageDiagnostics?: {
    totalArticlesFetched: number | null;
    totalCandidateEvents: number | null;
    lastSuccessfulFetchTime?: string;
    lastRankingRunTime?: string;
    failedSourceCount?: number;
    fallbackSourceCount?: number;
    degradedSourceNames?: string[];
    sourceCountsByCategory: {
      tech: number;
      finance: number;
      politics: number;
    };
  };
};

export type ViewerAccount = {
  id: string;
  email: string;
  displayName: string;
  initials: string;
  avatarUrl?: string | null;
};
