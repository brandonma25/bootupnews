function normalizeEnv(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizePositiveIntegerEnv(value: string | undefined) {
  const normalized = normalizeEnv(value);
  if (!normalized) {
    return "";
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
}

export function resolvePublicSupabaseConfig({
  supabaseUrl,
  supabaseAnonKey,
  supabasePublishableKey,
  appUrl,
}: {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabasePublishableKey?: string;
  appUrl?: string;
}) {
  const normalizedUrl = normalizeEnv(supabaseUrl);
  const normalizedAnonKey = normalizeEnv(supabaseAnonKey);
  const normalizedPublishableKey = normalizeEnv(supabasePublishableKey);
  const defaultAppUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "";

  return {
    url: normalizedUrl,
    key: normalizedAnonKey || normalizedPublishableKey,
    keySource: normalizedAnonKey
      ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      : normalizedPublishableKey
        ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
        : null,
    appUrl: normalizeEnv(appUrl) || defaultAppUrl,
  };
}

const homepageDebug =
  normalizeEnv(process.env.NEXT_PUBLIC_HOMEPAGE_DEBUG) || normalizeEnv(process.env.HOMEPAGE_DEBUG);

export const publicSupabaseConfig = resolvePublicSupabaseConfig({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
});

export function getSupabasePublicEnvDiagnostics() {
  const missingNames = [];

  if (!publicSupabaseConfig.url) {
    missingNames.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!publicSupabaseConfig.key) {
    missingNames.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return {
    isConfigured: missingNames.length === 0,
    missingNames,
    keySource: publicSupabaseConfig.keySource,
  };
}

export const env = {
  appUrl: publicSupabaseConfig.appUrl,
  adminEmails: normalizeEnv(process.env.ADMIN_EMAILS),
  homepageDebug,
  supabaseUrl: publicSupabaseConfig.url,
  supabaseAnonKey: publicSupabaseConfig.key,
  supabaseServiceRoleKey: normalizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
  openAiApiKey: normalizeEnv(process.env.OPENAI_API_KEY),
  openAiModel: normalizeEnv(process.env.OPENAI_MODEL) || "gpt-4.1-mini",
  openAiBaseUrl: normalizeEnv(process.env.OPENAI_BASE_URL) || "https://api.openai.com/v1",
  theNewsApiKey:
    normalizeEnv(process.env.THE_NEWS_API_KEY) || normalizeEnv(process.env.NEWS_API_KEY),
  newsApiKey: normalizeEnv(process.env.NEWS_API_KEY),
  tldrMaxItemsPerRun: normalizePositiveIntegerEnv(process.env.TLDR_MAX_ITEMS_PER_RUN),
  tldrLookbackDays: normalizePositiveIntegerEnv(process.env.TLDR_LOOKBACK_DAYS),
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isSupabaseServerConfigured = Boolean(
  env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey,
);

export const isAiConfigured = Boolean(env.openAiApiKey);
export const isHomepageDebugConfigured = /^(1|true|yes|on)$/i.test(env.homepageDebug);
