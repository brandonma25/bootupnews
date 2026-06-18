/**
 * Avoid logging full email addresses (PII). Keep the domain for debuggability,
 * mask the local part: "brandon@x.com" -> "b***n@x.com".
 *
 * Lives outside actions.ts (a "use server" module, where only async server
 * actions may be exported) so it can be unit-tested directly.
 */
export function maskEmail(email: string | null | undefined): string {
  const value = (email ?? "").trim();
  const at = value.indexOf("@");
  if (at <= 0) return value ? "***" : "";
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const maskedLocal = local.length <= 2 ? `${local[0] ?? ""}*` : `${local[0]}***${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}
