import { describe, expect, it } from "vitest";

import { formatBriefingDate, formatHomeBriefingDateLabel, getTaipeiDateKey } from "@/lib/utils";

describe("formatBriefingDate (Taipei-aware)", () => {
  it("labels a Taipei-today date-key as Today even late in the UTC day", () => {
    expect(formatBriefingDate("2026-06-18", new Date("2026-06-17T23:30:00.000Z"))).toMatch(/^Today •/);
  });
  it("labels an older date as a full date", () => {
    expect(formatBriefingDate("2026-06-10", new Date("2026-06-17T12:00:00.000Z"))).not.toMatch(/^Today/);
  });
});

describe("getTaipeiDateKey (F-1/F-2 Taipei freshness)", () => {
  it("rolls to the next calendar day for the 16:00–24:00 UTC window", () => {
    // 23:30 UTC on 06-17 is already 07:30 on 06-18 in Taipei (UTC+8).
    expect(getTaipeiDateKey(new Date("2026-06-17T23:30:00.000Z"))).toBe("2026-06-18");
    // 12:00 UTC stays the same Taipei day.
    expect(getTaipeiDateKey(new Date("2026-06-17T12:00:00.000Z"))).toBe("2026-06-17");
  });

  it("labels a Taipei-today briefing as Today even late in the UTC day (the bug fix)", () => {
    // briefing_date keyed 06-18 (Taipei); 'now' is 23:30 UTC 06-17 = 06-18 Taipei.
    expect(
      formatHomeBriefingDateLabel("2026-06-18T00:00:00.000Z", new Date("2026-06-17T23:30:00.000Z")),
    ).toMatch(/^Today •/);
  });
});

describe("formatHomeBriefingDateLabel", () => {
  it("labels same-day briefings as Today", () => {
    expect(
      formatHomeBriefingDateLabel(
        "2026-04-22T09:00:00.000Z",
        new Date("2026-04-22T12:00:00.000Z"),
      ),
    ).toBe("Today • Wednesday, April 22");
  });

  it("labels fallback briefings with their actual briefing date", () => {
    expect(
      formatHomeBriefingDateLabel(
        "2026-04-21T09:00:00.000Z",
        new Date("2026-04-22T12:00:00.000Z"),
      ),
    ).toBe("Tuesday, April 21, 2026");
  });
});
