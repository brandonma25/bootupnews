import { describe, expect, it, vi } from "vitest";

import {
  buildGmailNewsletterSearchQuery,
  createGmailApiClient,
  fetchBootUpBenchmarkEmails,
  GmailApiError,
  verifyGmailNewsletterLabelVisible,
} from "@/lib/newsletter-ingestion/gmail";

const { sentryCaptureMessage } = vi.hoisted(() => ({
  sentryCaptureMessage: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureMessage: sentryCaptureMessage,
}));

describe("Gmail newsletter API client", () => {
  it("builds the benchmark label search query with a since date", () => {
    expect(
      buildGmailNewsletterSearchQuery("bootup-news-benchmark", new Date("2026-05-09T14:30:00.000Z")),
    ).toBe("label:bootup-news-benchmark after:2026/05/09");
  });

  it("uses OAuth refresh-token flow and searches Gmail without exposing credentials", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "https://oauth2.googleapis.com/token") {
        return Response.json({ access_token: "access-token" });
      }

      expect(url).toContain("gmail.googleapis.com");
      expect(new URL(url).searchParams.get("q")).toBe("label:bootup-news-benchmark after:2026/05/09");
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

  it("confirms the exact newsletter label is visible without exposing secrets", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "https://oauth2.googleapis.com/token") {
        return Response.json({ access_token: "access-token" });
      }

      expect(url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/labels");
      return Response.json({
        labels: [
          { id: "Label_1", name: "bootup-news-benchmark", messagesTotal: 7, messagesUnread: 2 },
          { id: "Label_2", name: "Bootup News Benchmark", messagesTotal: 1, messagesUnread: 0 },
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

    const result = await verifyGmailNewsletterLabelVisible(gmailClient, "bootup-news-benchmark");

    expect(result).toEqual({
      ok: true,
      label: {
        id: "Label_1",
        name: "bootup-news-benchmark",
        messagesTotal: 7,
        messagesUnread: 2,
      },
    });
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain("refresh-token");
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain("client-secret");
  });

  it("fails closed with a sanitized account mismatch message when the label is missing", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "https://oauth2.googleapis.com/token") {
        return Response.json({ access_token: "access-token" });
      }

      return Response.json({
        labels: [
          { id: "Label_1", name: "other-label", messagesTotal: 7, messagesUnread: 2 },
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

    const result = await verifyGmailNewsletterLabelVisible(gmailClient, "bootup-news-benchmark");

    expect(result).toEqual({
      ok: false,
      label: "bootup-news-benchmark",
      message: expect.stringMatching(/label missing\/account mismatch/i),
    });
    if (!result.ok) {
      expect(result.message).not.toContain("refresh-token");
      expect(result.message).not.toContain("client-secret");
    }
  });

  // Track 2 P3 — per-call timeout. A hung Gmail call must NOT block the
  // cron toward the 60s Vercel function ceiling. The timeout fires at
  // 10s (per-call), aborts the request, captures Sentry, and raises a
  // retryable GmailApiError so the caller's retry policy handles it
  // uniformly.
  it("times out a hung Gmail call after the per-call ceiling and captures Sentry (#272 P3)", async () => {
    sentryCaptureMessage.mockReset();
    // Mock fetch that never resolves until aborted via the AbortSignal.
    // We listen to init.signal for the abort and reject with an AbortError
    // — exactly what runtimes do when AbortController.abort() fires.
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
          return;
        }
        signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    // Speed up the test — use fake timers to advance past the 10s ceiling.
    vi.useFakeTimers();

    const tokenPromise = (async () => {
      try {
        // getAccessToken() is the first call — wrap a refresh-token fetch.
        const { getGmailAccessToken } = await import("@/lib/newsletter-ingestion/gmail");
        return await getGmailAccessToken(
          {
            clientId: "client-id",
            clientSecret: "client-secret",
            refreshToken: "refresh-token",
          },
          fetchImpl as typeof fetch,
        );
      } catch (error) {
        return error;
      }
    })();

    // Advance past the 10s per-call ceiling.
    await vi.advanceTimersByTimeAsync(10_100);
    const outcome = await tokenPromise;
    vi.useRealTimers();

    expect(outcome).toBeInstanceOf(GmailApiError);
    expect((outcome as GmailApiError).message).toMatch(/timed out after 10000ms/i);
    // Timed-out OAuth refresh is retryable so any caller's retry policy
    // can re-attempt with backoff (the OAuth helper itself doesn't
    // retry; the gmailFetchJson wrapper does for API calls).
    expect((outcome as GmailApiError).retryable).toBe(true);

    expect(sentryCaptureMessage).toHaveBeenCalledWith(
      "Gmail call timed out",
      expect.objectContaining({
        level: "warning",
        fingerprint: ["gmail-call-timeout", "Gmail OAuth refresh"],
      }),
    );
  });
});
