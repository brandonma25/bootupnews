function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export const env = {
  appUrl: readEnv("NEXT_PUBLIC_APP_URL") || "http://localhost:3000",
  homepageDebug: readEnv("NEXT_PUBLIC_HOMEPAGE_DEBUG") || readEnv("HOMEPAGE_DEBUG"),
  supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey:
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  openAiApiKey: readEnv("OPENAI_API_KEY"),
  openAiModel: readEnv("OPENAI_MODEL") || "gpt-4.1-mini",
  openAiBaseUrl: readEnv("OPENAI_BASE_URL") || "https://api.openai.com/v1",
  theNewsApiKey: readEnv("THE_NEWS_API_KEY") || readEnv("NEWS_API_KEY"),
  newsApiKey: readEnv("NEWS_API_KEY"),
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isSupabaseServerConfigured = Boolean(
  env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey,
);

export const isAiConfigured = Boolean(env.openAiApiKey);
export const isHomepageDebugConfigured = /^(1|true|yes|on)$/i.test(env.homepageDebug);
