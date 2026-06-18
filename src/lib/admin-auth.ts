import type { User } from "@supabase/supabase-js";

import { env } from "@/lib/env";

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function parseAdminEmails(value = env.adminEmails) {
  return value
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isAdminEmail(
  email: string | null | undefined,
  adminEmails = env.adminEmails,
) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return new Set(parseAdminEmails(adminEmails)).has(normalizedEmail);
}

export function isAdminUser(
  user: Pick<User, "email"> | null | undefined,
  adminEmails = env.adminEmails,
) {
  return isAdminEmail(user?.email, adminEmails);
}

/**
 * Server-side admin AUTHORIZATION gate. Stricter than `isAdminUser`: in addition
 * to the email allowlist it requires a CONFIRMED email (`email_confirmed_at`).
 *
 * Why: the admin allowlist trusts the email claim. If a privileged email in the
 * allowlist has not yet registered, an attacker could sign up as that address and
 * — with email confirmation disabled — receive an instant session and full
 * editorial admin (publish to the public homepage). Requiring a confirmed email
 * closes that window. NOTE: this is only fully effective once email confirmation
 * is ENABLED in Supabase Auth (auto-confirm sets email_confirmed_at immediately);
 * keep both controls. Use this at every server-side admin boundary; the bare
 * `isAdminUser` remains only for cosmetic UI affordances.
 */
export function isVerifiedAdminUser(
  user: Pick<User, "email" | "email_confirmed_at"> | null | undefined,
  adminEmails = env.adminEmails,
) {
  if (!user?.email_confirmed_at) {
    return false;
  }

  return isAdminEmail(user.email, adminEmails);
}
