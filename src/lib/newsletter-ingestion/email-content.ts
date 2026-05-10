export type ParsedRawNewsletterEmail = {
  sender: string;
  subject: string;
  receivedAt: string | null;
  contentText: string;
};

type ParsedMimePart = {
  headers: Record<string, string>;
  body: string;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  return Buffer.from(padded, "base64").toString("utf8");
}

function splitHeadersAndBody(raw: string): ParsedMimePart {
  const normalized = raw.replace(/\r\n/g, "\n");
  const delimiterIndex = normalized.search(/\n\n/u);

  if (delimiterIndex === -1) {
    return {
      headers: {},
      body: normalized,
    };
  }

  const headerBlock = normalized.slice(0, delimiterIndex);
  const body = normalized.slice(delimiterIndex + 2);
  const unfolded = headerBlock.replace(/\n[ \t]+/g, " ");
  const headers = unfolded.split("\n").reduce<Record<string, string>>((acc, line) => {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      return acc;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key) {
      acc[key] = value;
    }

    return acc;
  }, {});

  return { headers, body };
}

function decodeQuotedPrintable(value: string) {
  return value
    .replace(/=\n/g, "")
    .replace(/=([0-9a-f]{2})/gi, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
}

function decodeMimeWord(value: string) {
  return value.replace(
    /=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g,
    (_match, charset: string, encoding: string, encoded: string) => {
      const normalizedCharset = charset.toLowerCase();

      if (normalizedCharset !== "utf-8" && normalizedCharset !== "us-ascii") {
        return encoded;
      }

      if (encoding.toLowerCase() === "b") {
        return Buffer.from(encoded, "base64").toString("utf8");
      }

      return decodeQuotedPrintable(encoded.replace(/_/g, " "));
    },
  );
}

function getHeaderParams(headerValue: string | undefined) {
  const parts = (headerValue ?? "").split(";").map((part) => part.trim());
  const value = parts[0]?.toLowerCase() ?? "";
  const params = parts.slice(1).reduce<Record<string, string>>((acc, part) => {
    const separatorIndex = part.indexOf("=");

    if (separatorIndex === -1) {
      return acc;
    }

    const key = part.slice(0, separatorIndex).trim().toLowerCase();
    const rawValue = part.slice(separatorIndex + 1).trim();
    acc[key] = rawValue.replace(/^"|"$/g, "");
    return acc;
  }, {});

  return { value, params };
}

function decodePartBody(body: string, transferEncoding: string | undefined) {
  const encoding = (transferEncoding ?? "").toLowerCase();

  if (encoding === "base64") {
    return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
  }

  if (encoding === "quoted-printable") {
    return decodeQuotedPrintable(body);
  }

  return body;
}

function splitMultipartBody(body: string, boundary: string) {
  const delimiter = `--${boundary}`;

  return body
    .split(delimiter)
    .slice(1)
    .map((part) => part.replace(/^\n/u, "").replace(/\n--\s*$/u, ""))
    .filter((part) => part.trim() && part.trim() !== "--");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function htmlToTextWithLinks(html: string) {
  const withLinks = html.replace(
    /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, label: string) => {
      const cleanLabel = stripHtml(label).trim();
      const cleanHref = decodeHtmlEntities(href).trim();

      return cleanLabel ? `${cleanLabel} (${cleanHref})` : cleanHref;
    },
  );

  return stripHtml(
    withLinks
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n- "),
  );
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "));
}

function normalizeContentText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collectTextParts(part: ParsedMimePart): string[] {
  const contentType = getHeaderParams(part.headers["content-type"]);
  const transferEncoding = part.headers["content-transfer-encoding"];

  if (contentType.value.startsWith("multipart/")) {
    const boundary = contentType.params.boundary;

    if (!boundary) {
      return [];
    }

    return splitMultipartBody(part.body, boundary).flatMap((rawPart) =>
      collectTextParts(splitHeadersAndBody(rawPart)),
    );
  }

  if (contentType.value === "text/plain" || (!contentType.value && part.body.trim())) {
    return [decodePartBody(part.body, transferEncoding)];
  }

  if (contentType.value === "text/html") {
    return [htmlToTextWithLinks(decodePartBody(part.body, transferEncoding))];
  }

  return [];
}

export function parseRawNewsletterEmail(
  rawBase64Url: string,
  input: {
    internalDate?: string | null;
  } = {},
): ParsedRawNewsletterEmail {
  const raw = decodeBase64Url(rawBase64Url);
  const root = splitHeadersAndBody(raw);
  const dateHeader = root.headers.date ? Date.parse(root.headers.date) : NaN;
  const internalDateMs = input.internalDate && /^\d+$/u.test(input.internalDate)
    ? Number(input.internalDate)
    : NaN;
  const receivedAt = Number.isFinite(dateHeader)
    ? new Date(dateHeader).toISOString()
    : Number.isFinite(internalDateMs)
      ? new Date(internalDateMs).toISOString()
      : null;
  const contentText = normalizeContentText(collectTextParts(root).join("\n\n"));

  return {
    sender: decodeMimeWord(root.headers.from ?? ""),
    subject: decodeMimeWord(root.headers.subject ?? ""),
    receivedAt,
    contentText,
  };
}

export function decodeGmailRawMessage(rawBase64Url: string) {
  return decodeBase64Url(rawBase64Url);
}
