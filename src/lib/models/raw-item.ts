import type { CanonicalSourceMetadata } from "@/lib/integration/subsystem-contracts";
import type { TldrDiscoveryMetadata } from "@/lib/tldr";

export interface RawItem {
  id: string;
  source: string;
  title: string;
  url: string;
  published_at: string;
  raw_content: string;
  source_metadata?: CanonicalSourceMetadata;
  discovery_metadata?: TldrDiscoveryMetadata;
}
