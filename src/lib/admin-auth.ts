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
