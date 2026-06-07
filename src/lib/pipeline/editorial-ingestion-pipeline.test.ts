import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the three leaf stage fns so we can assert which run per subset + with what args.
const mocks = vi.hoisted(() => ({
  runNewsletterIngestion: vi.fn(),
  runDailyNewsCron: vi.fn(),
  runEditorialStaging: vi.fn(),
}));
vi.mock("@/lib/newsletter-ingestion/runner", () => ({ runNewsletterIngestion: mocks.runNewsletterIngestion }));
vi.mock("@/lib/cron/fetch-news", () => ({ runDailyNewsCron: mocks.runDailyNewsCron }));
vi.mock("@/lib/editorial-staging/runner", () => ({ runEditorialStaging: mocks.runEditorialStaging }));

import { runEditorialIngestionPipeline } from "@/lib/pipeline/editorial-ingestion-pipeline";

const NOW = new Date("2026-06-07T12:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.runNewsletterIngestion.mockResolvedValue({ success: true, timestamp: "t", summary: { message: "nl" } });
  mocks.runDailyNewsCron.mockResolvedValue({ success: true, timestamp: "t", summary: { message: "rss" } });
  mocks.runEditorialStaging.mockResolvedValue({
    success: true,
    timestamp: "t",
    summary: { message: "st", briefingDate: "2026-06-07" },
  });
});

describe("runEditorialIngestionPipeline — stage subsets (leg decoupling)", () => {
  it("the newsletter subset runs ONLY the newsletter stage", async () => {
    const r = await runEditorialIngestionPipeline({ dryRun: false, now: NOW, stages: ["newsletter"] });

    expect(mocks.runNewsletterIngestion).toHaveBeenCalledTimes(1);
    expect(mocks.runDailyNewsCron).not.toHaveBeenCalled();
    expect(mocks.runEditorialStaging).not.toHaveBeenCalled();
    expect(r.newsletter).not.toBeNull();
    expect(r.rss).toBeNull();
    expect(r.editorialStaging).toBeNull();
  });

  it("the [rss, editorial_staging] subset runs ONLY those, RSS before staging", async () => {
    const r = await runEditorialIngestionPipeline({
      dryRun: false,
      now: NOW,
      stages: ["rss", "editorial_staging"],
    });

    expect(mocks.runNewsletterIngestion).not.toHaveBeenCalled();
    expect(mocks.runDailyNewsCron).toHaveBeenCalledTimes(1);
    expect(mocks.runEditorialStaging).toHaveBeenCalledTimes(1);
    expect(mocks.runDailyNewsCron.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.runEditorialStaging.mock.invocationCallOrder[0],
    );
    expect(r.newsletter).toBeNull();
    expect(r.rss).not.toBeNull();
    expect(r.editorialStaging).not.toBeNull();
  });

  it("decoupled flow calls the SAME leaf fns with the SAME args as a single-request run (same-slate equivalence)", async () => {
    // Single-request baseline: all three stages together.
    await runEditorialIngestionPipeline({ dryRun: false, now: NOW });
    const combinedNl = mocks.runNewsletterIngestion.mock.calls[0];
    const combinedRss = mocks.runDailyNewsCron.mock.calls[0];
    const combinedStaging = mocks.runEditorialStaging.mock.calls[0];

    mocks.runNewsletterIngestion.mockClear();
    mocks.runDailyNewsCron.mockClear();
    mocks.runEditorialStaging.mockClear();

    // Decoupled: newsletter endpoint, then the briefing endpoint.
    await runEditorialIngestionPipeline({ dryRun: false, now: NOW, stages: ["newsletter"] });
    await runEditorialIngestionPipeline({ dryRun: false, now: NOW, stages: ["rss", "editorial_staging"] });

    // Identical args ⇒ identical behavior. Staging in particular gets the SAME
    // args in both flows — it sources newsletter candidates from the DB (not an
    // in-process newsletter result), so the partition yields the same slate.
    expect(mocks.runNewsletterIngestion.mock.calls[0]).toEqual(combinedNl);
    expect(mocks.runDailyNewsCron.mock.calls[0]).toEqual(combinedRss);
    expect(mocks.runEditorialStaging.mock.calls[0]).toEqual(combinedStaging);
  });

  it("defaults to all three stages when no subset is given", async () => {
    const r = await runEditorialIngestionPipeline({ dryRun: false, now: NOW });
    expect(mocks.runNewsletterIngestion).toHaveBeenCalledTimes(1);
    expect(mocks.runDailyNewsCron).toHaveBeenCalledTimes(1);
    expect(mocks.runEditorialStaging).toHaveBeenCalledTimes(1);
    expect(r.newsletter).not.toBeNull();
    expect(r.rss).not.toBeNull();
    expect(r.editorialStaging).not.toBeNull();
  });
});
