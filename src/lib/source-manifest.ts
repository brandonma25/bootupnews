import { demoSources } from "@/lib/demo-data";
import type { Source } from "@/lib/types";

export const PUBLIC_SURFACE_SOURCE_MANIFEST = {
  "public.home": [
    "source-verge",
    "source-ars",
    "source-tldr-tech",
    "source-techcrunch",
    "source-ft",
    "source-reuters-world",
  ],
} as const;

export type PublicSurfaceKey = keyof typeof PUBLIC_SURFACE_SOURCE_MANIFEST;

const MANIFEST_SOURCE_IDS: ReadonlySet<string> = new Set(Object.values(PUBLIC_SURFACE_SOURCE_MANIFEST).flat());

export function getSourcesForPublicSurface(surface: PublicSurfaceKey): Source[] {
  const sourceIds = PUBLIC_SURFACE_SOURCE_MANIFEST[surface];
  const sourcesById = new Map(demoSources.map((source) => [source.id, source]));

  return sourceIds.map((sourceId) => {
    const source = sourcesById.get(sourceId);

    if (!source) {
      throw new Error(`Public source manifest for ${surface} references missing demoSources entry ${sourceId}`);
    }

    return source;
  });
}

export function isManifestSourceList(sources: Source[]): boolean {
  return sources.every((source) => MANIFEST_SOURCE_IDS.has(source.id));
}
