import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Dev-only manual-QA harness for the MVP measurement instrumentation
 * (signal_read dwell tracking + comprehension self-report). Renders the
 * REAL SignalCard and ComprehensionSelfReport components with hardcoded
 * mock signals so the four PR-284 behaviors can be exercised on
 * localhost without a Supabase round-trip.
 *
 * Gated to development:
 *   - In production builds the route returns 404 before any client code
 *     is loaded (`notFound()` short-circuits the render).
 *   - The harness client module is dynamic-imported so the production
 *     bundle's page entry contains only the gate check, not the mock
 *     signals or the harness UI.
 *
 * See [PRD-68] for the measurement contract this harness exercises.
 */
export default async function MvpHarnessPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const { MvpHarnessClient } = await import("./harness-client");
  return <MvpHarnessClient />;
}
