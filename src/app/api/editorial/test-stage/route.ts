import { NextResponse } from "next/server";

import { runEditorialStaging } from "@/lib/editorial-staging/runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// One-time test endpoint — delete after workflow is validated.
// Passes now = noon Taipei 2026-05-14 so all date-keyed queries use that briefing date.
export async function GET() {
  const testNow = new Date("2026-05-14T04:00:00Z"); // 12:00 Taipei (UTC+8)
  const result = await runEditorialStaging({ now: testNow });
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
