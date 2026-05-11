import { DEFAULT_NEWSLETTER_LABEL } from "@/lib/newsletter-ingestion/config";

export type GmailFetch = typeof fetch;

export type GmailCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type GmailMessageRef = {
  id: string;
  threadId: string;
};

export type GmailLabel = {
  id: string;
  name: string;
  messagesTotal: number | null;
  messagesUnread: number | null;
};

export type GmailRawMessage = GmailMessageRef & {
  raw: string;
  internalDate: string | null;
};

export type GmailApiClient = {
  getLabelByName(label: string): Promise<GmailLabel | null>;
  listNewsletterMessages(input: {
    label?: string;
    sinceDate: Date;
    maxResults: number;
  }): Promise<GmailMessageRef[]>;
  getRawMessage(messageId: string): Promise<GmailRawMessage>;
};

type GmailListResponse = {
  messages?: Array<{
    id?: string;
    threadId?: string;
  }>;
};

type GmailRawMessageResponse = {
  id?: string;
  threadId?: string;
  raw?: string;
  internalDate?: string;
};

type GmailLabelsResponse = {
  labels?: Array<{
    id?: string;
    name?: string;
    messagesTotal?: number;
    messagesUnread?: number;
  }>;
};

type GmailTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
};

export class GmailApiError extends Error {
  status: number | null;
  retryable: boolean;

  constructor(message: string, input: { status?: number | null; retryable?: boolean } = {}) {
    super(message);
    this.name = "GmailApiError";
    this.status = input.status ?? null;
    this.retryable = input.retryable ?? false;
  }
}

function toGmailDate(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

function normalizeLabel(label: string) {
  return label.trim() || DEFAULT_NEWSLETTER_LABEL;
}

function quoteGmailSearchValue(value: string) {
  return /[\s"]/u.test(value) ? `"${value.replaceAll("\"", "\\\"")}"` : value;
}

export function buildGmailNewsletterSearchQuery(
  label = DEFAULT_NEWSLETTER_LABEL,
  sinceDate: Date,
) {
  return `label:${quoteGmailSearchValue(normalizeLabel(label))} after:${toGmailDate(sinceDate)}`;
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJsonResponse<T>(response: Response, failureLabel: string): Promise<T> {
  if (response.ok) {
    return await response.json() as T;
  }

  throw new GmailApiError(`${failureLabel} failed with HTTP ${response.status}.`, {
    status: response.status,
    retryable: isRetryableStatus(response.status),
  });
}

export async function getGmailAccessToken(
  credentials: GmailCredentials,
  fetchImpl: GmailFetch = fetch,
) {
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = await parseJsonResponse<GmailTokenResponse>(response, "Gmail OAuth refresh");
  const accessToken = body.access_token?.trim();

  if (!accessToken) {
    throw new GmailApiError("Gmail OAuth refresh did not return an access token.", {
      status: response.status,
      retryable: false,
    });
  }

  return accessToken;
}

async function gmailFetchJson<T>(
  input: {
    url: URL;
    accessToken: string;
    failureLabel: string;
    fetchImpl: GmailFetch;
    maxRetries?: number;
  },
): Promise<T> {
  const maxRetries = input.maxRetries ?? 2;
  let attempt = 0;

  while (true) {
    const response = await input.fetchImpl(input.url, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    });

    try {
      return await parseJsonResponse<T>(response, input.failureLabel);
    } catch (error) {
      if (
        error instanceof GmailApiError &&
        error.retryable &&
        attempt < maxRetries
      ) {
        attempt += 1;
        await wait(100 * attempt);
        continue;
      }

      throw error;
    }
  }
}

export function createGmailApiClient(input: {
  credentials: GmailCredentials;
  fetchImpl?: GmailFetch;
}): GmailApiClient {
  const fetchImpl = input.fetchImpl ?? fetch;
  let accessTokenPromise: Promise<string> | null = null;

  async function getAccessToken() {
    accessTokenPromise ??= getGmailAccessToken(input.credentials, fetchImpl);
    return accessTokenPromise;
  }

  return {
    async getLabelByName(label) {
      const normalizedLabel = normalizeLabel(label);
      const accessToken = await getAccessToken();
      const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/labels");
      const body = await gmailFetchJson<GmailLabelsResponse>({
        url,
        accessToken,
        fetchImpl,
        failureLabel: "Gmail label preflight",
      });
      const labelMatch = (body.labels ?? []).find((entry) => entry.name === normalizedLabel);

      if (!labelMatch?.id || !labelMatch.name) {
        return null;
      }

      return {
        id: labelMatch.id,
        name: labelMatch.name,
        messagesTotal: typeof labelMatch.messagesTotal === "number" ? labelMatch.messagesTotal : null,
        messagesUnread: typeof labelMatch.messagesUnread === "number" ? labelMatch.messagesUnread : null,
      };
    },

    async listNewsletterMessages({ label = DEFAULT_NEWSLETTER_LABEL, sinceDate, maxResults }) {
      const accessToken = await getAccessToken();
      const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
      url.searchParams.set("q", buildGmailNewsletterSearchQuery(label, sinceDate));
      url.searchParams.set("maxResults", String(maxResults));

      const body = await gmailFetchJson<GmailListResponse>({
        url,
        accessToken,
        fetchImpl,
        failureLabel: "Gmail newsletter message search",
      });

      return (body.messages ?? [])
        .filter((message): message is { id: string; threadId: string } =>
          Boolean(message.id && message.threadId),
        )
        .map((message) => ({
          id: message.id,
          threadId: message.threadId,
        }));
    },

    async getRawMessage(messageId) {
      const accessToken = await getAccessToken();
      const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}`);
      url.searchParams.set("format", "raw");

      const body = await gmailFetchJson<GmailRawMessageResponse>({
        url,
        accessToken,
        fetchImpl,
        failureLabel: "Gmail raw message fetch",
      });

      if (!body.id || !body.threadId || !body.raw) {
        throw new GmailApiError("Gmail raw message response was missing required fields.", {
          retryable: false,
        });
      }

      return {
        id: body.id,
        threadId: body.threadId,
        raw: body.raw,
        internalDate: body.internalDate ?? null,
      };
    },
  };
}

export async function fetchBootUpBenchmarkEmails(
  sinceDate: Date,
  input: {
    gmailClient: GmailApiClient;
    label?: string;
    maxResults: number;
  },
) {
  return input.gmailClient.listNewsletterMessages({
    label: input.label ?? DEFAULT_NEWSLETTER_LABEL,
    sinceDate,
    maxResults: input.maxResults,
  });
}

export type GmailLabelPreflightResult =
  | {
      ok: true;
      label: GmailLabel;
    }
  | {
      ok: false;
      label: string;
      message: string;
    };

export async function verifyGmailNewsletterLabelVisible(
  gmailClient: GmailApiClient,
  label = DEFAULT_NEWSLETTER_LABEL,
): Promise<GmailLabelPreflightResult> {
  const normalizedLabel = normalizeLabel(label);
  const visibleLabel = await gmailClient.getLabelByName(normalizedLabel);

  if (!visibleLabel) {
    return {
      ok: false,
      label: normalizedLabel,
      message:
        `Gmail label "${normalizedLabel}" is not visible to the authorized account ` +
        "(label missing/account mismatch). " +
        "Regenerate the refresh token from the Gmail account that contains that label.",
    };
  }

  return {
    ok: true,
    label: visibleLabel,
  };
}
