type PipelineLogLevel = "info" | "warn" | "error";

export function logPipelineEvent(
  level: PipelineLogLevel,
  message: string,
  context: Record<string, unknown> = {},
) {
  const payload = JSON.stringify({
    scope: "cluster-first-pipeline",
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  });

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}
