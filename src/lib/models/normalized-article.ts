import type { CanonicalSourceMetadata } from "@/lib/integration/subsystem-contracts";
import type { TldrDiscoveryMetadata } from "@/lib/tldr";

export interface NormalizedArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  published_at: string;
  content: string;
  entities: string[];
  normalized_entities: string[];
  keywords: string[];
  title_tokens: string[];
  content_tokens: string[];
  source_metadata?: CanonicalSourceMetadata;
  discovery_metadata?: TldrDiscoveryMetadata;
}
