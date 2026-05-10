import { describe, expect, it, vi } from "vitest";

import {
  buildGmailNewsletterSearchQuery,
  createGmailApiClient,
  fetchBootUpBenchmarkEmails,
  GmailApiError,
} from "@/lib/newsletter-ingestion/gmail";

describe("Gmail newsletter API client", () => {
  it("builds the benchmark label search query with a since date", () => {
    expect(
      buildGmailNewsletterSearchQuery("boot-up-benchmark", new Date("2026-05-09T14:30:00.000Z")),
    ).toBe("label:boot-up-benchmark after:2026/05/09");
  });

  it("uses OAuth refresh-token flow and searches Gmail without exposing credentials", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "https://oauth2.googleapis.com/token") {
        return Response.json({ access_token: "access-token" });
      }

      expect(url).toContain("gmail.googleapis.com");
      expect(new URL(url).searchParams.get("q")).toBe("label:boot-up-benchmark after:2026/05/09");
      return Response.json({
        messages: [
          { id: "message-1", threadId: "thread-a" },
          { id: "message-2", threadId: "thread-a" },
        ],
      });
    });
    const gmailClient = createGmailApiClient({
      credentials: {
        clientId: "client-id",
        clientSecret: "client-secret",
        refreshToken: "refresh-token",
      },
      fetchImpl: fetchImpl as typeof fetch,
    });

    const refs = await fetchBootUpBenchmarkEmails(new Date("2026-05-09T00:00:00.000Z"), {
      gmailClient,
      maxResults: 5,
    });

    expect(refs).toEqual([
      { id: "message-1", threadId: "thread-a" },
      { id: "message-2", threadId: "thread-a" },
    ]);
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain("refresh-token");
  });

  it("classifies Gmail rate limits as retryable API errors", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "https://oauth2.googleapis.com/token") {
        return Response.json({ access_token: "access-token" });
      }

      return new Response("rate limited", { status: 429 });
    });
    const gmailClient = createGmailApiClient({
      credentials: {
        clientId: "client-id",
        clientSecret: "client-secret",
        refreshToken: "refresh-token",
      },
      fetchImpl: fetchImpl as typeof fetch,
    });

    await expect(
      fetchBootUpBenchmarkEmails(new Date("2026-05-09T00:00:00.000Z"), {
        gmailClient,
        maxResults: 5,
      }),
    ).rejects.toMatchObject({
      name: "GmailApiError",
      status: 429,
      retryable: true,
    } satisfies Partial<GmailApiError>);
  });
});
