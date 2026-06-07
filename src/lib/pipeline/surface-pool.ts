/**
 * SURFACE_POOL_SIZE — the editorial / review selection-pool ceiling (PRD-53).
 *
 * Background (remediation): surfacing was an effective hard top-N≈6 cap feeding a
 * 5-slot public set, so the machine curated the slate instead of the editor. This
 * restores a real review pool: the daily pipeline selects up to SURFACE_POOL_SIZE
 * candidates into the editorial/review surface (signal_posts at needs_review), and
 * the human makes the final public selection downstream.
 *
 * This governs the EDITORIAL pool only. The public homepage display cap is a
 * separate, smaller downstream cap and is intentionally unchanged.
 *
 * CEILING with graceful degrade: a thin news day legitimately yields fewer
 * candidates; SURFACE_POOL_SIZE is the maximum, not a target to pad toward.
 */

/** Default editorial/review pool ceiling. */
export const DEFAULT_SURFACE_POOL_SIZE = 22;

/**
 * Resolve the editorial pool ceiling from `SURFACE_POOL_SIZE` (env), falling back
 * to the default. Invalid / non-positive values fall back silently — a
 * misconfigured env var must never collapse the pool to zero or break ingestion.
 */
export function resolveSurfacePoolSize(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.SURFACE_POOL_SIZE?.trim();
  if (!raw) return DEFAULT_SURFACE_POOL_SIZE;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : DEFAULT_SURFACE_POOL_SIZE;
}
