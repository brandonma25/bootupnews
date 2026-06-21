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

// Decode quoted-printable into RAW BYTES. The previous implementation decoded
// each =XX escape with String.fromCharCode, treating every byte as its own Latin-1
// code point — so multi-byte UTF-8 (smart quotes, em dashes, accents) came out as
// mojibake ("Semaforâ€™s"). Buffering the bytes lets the caller re-decode them with
// the part's declared charset.
function decodeQuotedPrintableToBytes(value: string): Buffer {
  const withoutSoftBreaks = value.replace(/=\r?\n/g, "");
  const bytes: number[] = [];

  for (let index = 0; index < withoutSoftBreaks.length; index += 1) {
    const char = withoutSoftBreaks[index]!;

    if (char === "=" && index + 2 < withoutSoftBreaks.length) {
      const hex = withoutSoftBreaks.slice(index + 1, index + 3);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        bytes.push(Number.parseInt(hex, 16));
        index += 2;
        continue;
      }
    }

    // QP literal chars are printable ASCII; mask to a single byte defensively.
    bytes.push(char.charCodeAt(0) & 0xff);
  }

  return Buffer.from(bytes);
}

// Decode raw bytes using a MIME charset label. Defaults to utf-8 and falls back to
// utf-8 for an unknown/unsupported label rather than throwing. WHATWG maps
// iso-8859-1 -> windows-1252, so both labels decode 0x92 -> U+2019, etc.
function decodeBytesWithCharset(bytes: Buffer, charset: string | undefined): string {
  const label = (charset ?? "").toLowerCase().trim() || "utf-8";
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
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
        return decodeBytesWithCharset(Buffer.from(encoded, "base64"), normalizedCharset);
      }

      return decodeBytesWithCharset(
        decodeQuotedPrintableToBytes(encoded.replace(/_/g, " ")),
        normalizedCharset,
      );
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

export function decodePartBody(body: string, transferEncoding: string | undefined, charset?: string) {
  const encoding = (transferEncoding ?? "").toLowerCase();

  if (encoding === "base64") {
    return decodeBytesWithCharset(Buffer.from(body.replace(/\s+/g, ""), "base64"), charset);
  }

  if (encoding === "quoted-printable") {
    return decodeBytesWithCharset(decodeQuotedPrintableToBytes(body), charset);
  }

  // 7bit / 8bit / none: the raw MIME was already read as utf-8 upstream
  // (decodeGmailRawMessage), so the body is text. A non-utf-8 8bit part is a rare
  // edge that would need re-reading the source bytes — out of scope here.
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
  const charset = contentType.params.charset;

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
    return [decodePartBody(part.body, transferEncoding, charset)];
  }

  if (contentType.value === "text/html") {
    return [htmlToTextWithLinks(decodePartBody(part.body, transferEncoding, charset))];
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
