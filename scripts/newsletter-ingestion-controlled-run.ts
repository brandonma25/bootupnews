import { runNewsletterIngestion } from "@/lib/newsletter-ingestion/runner";

async function main() {
  const result = await runNewsletterIngestion({
    testRunId: process.env.NEWSLETTER_INGESTION_TEST_RUN_ID?.trim() || "local-controlled-run",
  });

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    success: false,
    message: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 1;
});
