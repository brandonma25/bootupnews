export const DEFAULT_NEWSLETTER_LABEL = "bootup-news-benchmark";
export const DEFAULT_NEWSLETTER_MAX_EMAILS_PER_RUN = 10;
export const DEFAULT_NEWSLETTER_SINCE_HOURS = 36;

const VALID_TARGET_ENVIRONMENTS = new Set(["local", "preview", "staging", "production"]);

export type NewsletterTargetEnvironment = "local" | "preview" | "staging" | "production";

export type NewsletterIngestionConfig = {
  enabled: boolean;
  dryRun: boolean;
  writeCandidates: boolean;
  label: string;
  maxEmailsPerRun: number;
  sinceHours: number;
  targetEnvironment: NewsletterTargetEnvironment;
  allowProductionWrites: boolean;
  gmailClientId: string;
  gmailClientSecret: string;
  gmailRefreshToken: string;
};

export type NewsletterIngestionConfigValidation = {
  ok: boolean;
  missingEnv: string[];
  message: string | null;
};

function normalizeEnv(value: string | undefined) {
  return value?.trim() ?? "";
}

function parseBooleanEnv(value: string | undefined, defaultValue = false) {
  const normalized = normalizeEnv(value);

  if (!normalized) {
    return defaultValue;
  }

  return /^(1|true|yes|on)$/i.test(normalized);
}

function parsePositiveIntegerEnv(value: string | undefined, defaultValue: number, envName: string) {
  const normalized = normalizeEnv(value);

  if (!normalized) {
    return defaultValue;
  }

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  return parsed;
}

function parseTargetEnvironment(env: NodeJS.ProcessEnv): NewsletterTargetEnvironment {
  const normalized = (
    normalizeEnv(env.NEWSLETTER_INGESTION_TARGET_ENV) ||
    normalizeEnv(env.PIPELINE_TARGET_ENV) ||
    normalizeEnv(env.VERCEL_ENV) ||
    (normalizeEnv(env.NODE_ENV) === "production" ? "production" : "local")
  ).toLowerCase();

  if (!VALID_TARGET_ENVIRONMENTS.has(normalized)) {
    throw new Error(
      `NEWSLETTER_INGESTION_TARGET_ENV must be one of: ${[...VALID_TARGET_ENVIRONMENTS].join(", ")}.`,
    );
  }

  return normalized as NewsletterTargetEnvironment;
}

export function resolveNewsletterIngestionConfig(
  env: NodeJS.ProcessEnv = process.env,
  overrides: Partial<Pick<
    NewsletterIngestionConfig,
    "dryRun" | "writeCandidates" | "label" | "maxEmailsPerRun" | "sinceHours"
  >> = {},
): NewsletterIngestionConfig {
  const dryRun = overrides.dryRun ?? parseBooleanEnv(env.NEWSLETTER_INGESTION_DRY_RUN, true);

  return {
    enabled: parseBooleanEnv(env.NEWSLETTER_INGESTION_ENABLED, false),
    dryRun,
    writeCandidates: overrides.writeCandidates ?? true,
    label: overrides.label ?? (normalizeEnv(env.GMAIL_NEWSLETTER_LABEL) || DEFAULT_NEWSLETTER_LABEL),
    maxEmailsPerRun: overrides.maxEmailsPerRun ??
      parsePositiveIntegerEnv(
        env.NEWSLETTER_INGESTION_MAX_EMAILS_PER_RUN,
        DEFAULT_NEWSLETTER_MAX_EMAILS_PER_RUN,
        "NEWSLETTER_INGESTION_MAX_EMAILS_PER_RUN",
      ),
    sinceHours: overrides.sinceHours ??
      parsePositiveIntegerEnv(
        env.NEWSLETTER_INGESTION_SINCE_HOURS,
        DEFAULT_NEWSLETTER_SINCE_HOURS,
        "NEWSLETTER_INGESTION_SINCE_HOURS",
      ),
    targetEnvironment: parseTargetEnvironment(env),
    allowProductionWrites: parseBooleanEnv(env.ALLOW_PRODUCTION_NEWSLETTER_INGESTION, false),
    gmailClientId: normalizeEnv(env.GMAIL_CLIENT_ID),
    gmailClientSecret: normalizeEnv(env.GMAIL_CLIENT_SECRET),
    gmailRefreshToken: normalizeEnv(env.GMAIL_REFRESH_TOKEN),
  };
}

export function getNewsletterSinceDate(config: NewsletterIngestionConfig, now = new Date()) {
  return new Date(now.getTime() - config.sinceHours * 60 * 60 * 1000);
}

export function validateNewsletterGmailEnv(config: NewsletterIngestionConfig): NewsletterIngestionConfigValidation {
  const missingEnv = [
    config.gmailClientId ? null : "GMAIL_CLIENT_ID",
    config.gmailClientSecret ? null : "GMAIL_CLIENT_SECRET",
    config.gmailRefreshToken ? null : "GMAIL_REFRESH_TOKEN",
  ].filter((value): value is string => Boolean(value));

  return {
    ok: missingEnv.length === 0,
    missingEnv,
    message: missingEnv.length === 0
      ? null
      : `Newsletter ingestion cannot call Gmail until required env vars are configured: ${missingEnv.join(", ")}.`,
  };
}

export function canWriteNewsletterIngestionRecords(config: NewsletterIngestionConfig) {
  if (!config.enabled || config.dryRun) {
    return false;
  }

  if (config.targetEnvironment !== "production") {
    return true;
  }

  return config.allowProductionWrites;
}

export function getNewsletterWriteBlockReason(config: NewsletterIngestionConfig) {
  if (!config.enabled) {
    return "NEWSLETTER_INGESTION_ENABLED is not true.";
  }

  if (config.dryRun) {
    return "NEWSLETTER_INGESTION_DRY_RUN is true.";
  }

  if (config.targetEnvironment === "production" && !config.allowProductionWrites) {
    return "production writes require ALLOW_PRODUCTION_NEWSLETTER_INGESTION=true.";
  }

  return null;
}
