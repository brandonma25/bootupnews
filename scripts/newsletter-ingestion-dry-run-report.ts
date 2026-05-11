import { buildNewsletterDryRunReport } from "@/lib/newsletter-ingestion/dry-run-report";

async function main() {
  const report = await buildNewsletterDryRunReport();

  console.log(JSON.stringify(report, null, 2));

  if (!report.success) {
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
