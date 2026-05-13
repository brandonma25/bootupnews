import { describe, expect, it } from "vitest";

import {
  canWriteNewsletterIngestionRecords,
  getNewsletterWriteBlockReason,
  resolveNewsletterIngestionConfig,
  validateNewsletterGmailEnv,
} from "@/lib/newsletter-ingestion/config";

describe("newsletter ingestion config", () => {
  it("defaults to disabled dry-run behavior", () => {
    const config = resolveNewsletterIngestionConfig({});

    expect(config.enabled).toBe(false);
    expect(config.dryRun).toBe(true);
    expect(config.label).toBe("bootup-news-benchmark");
    expect(canWriteNewsletterIngestionRecords(config)).toBe(false);
    expect(getNewsletterWriteBlockReason(config)).toMatch(/enabled/i);
  });

  it("requires Gmail OAuth env before API calls", () => {
    const config = resolveNewsletterIngestionConfig({
      NEWSLETTER_INGESTION_ENABLED: "true",
      NEWSLETTER_INGESTION_DRY_RUN: "true",
    });

    expect(validateNewsletterGmailEnv(config)).toEqual({
      ok: false,
      missingEnv: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"],
      message: expect.stringContaining("GMAIL_CLIENT_ID"),
    });
  });

  it("blocks production writes without an explicit production allow flag", () => {
    const config = resolveNewsletterIngestionConfig({
      NEWSLETTER_INGESTION_ENABLED: "true",
      NEWSLETTER_INGESTION_DRY_RUN: "false",
      NEWSLETTER_INGESTION_TARGET_ENV: "production",
      GMAIL_CLIENT_ID: "client",
      GMAIL_CLIENT_SECRET: "secret",
      GMAIL_REFRESH_TOKEN: "refresh",
    });

    expect(canWriteNewsletterIngestionRecords(config)).toBe(false);
    expect(getNewsletterWriteBlockReason(config)).toMatch(/production writes/i);
  });

  it("allows controlled non-production writes when enabled and not dry-run", () => {
    const config = resolveNewsletterIngestionConfig({
      NEWSLETTER_INGESTION_ENABLED: "true",
      NEWSLETTER_INGESTION_DRY_RUN: "false",
      NEWSLETTER_INGESTION_TARGET_ENV: "preview",
      GMAIL_CLIENT_ID: "client",
      GMAIL_CLIENT_SECRET: "secret",
      GMAIL_REFRESH_TOKEN: "refresh",
    });

    expect(validateNewsletterGmailEnv(config).ok).toBe(true);
    expect(canWriteNewsletterIngestionRecords(config)).toBe(true);
  });
});
