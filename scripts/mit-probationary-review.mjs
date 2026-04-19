import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import Parser from "rss-parser";

const DEFAULT_OUTPUT_PATH = "mit-probationary-review.md";
const DEFAULT_JSON_OUTPUT_PATH = "mit-probationary-review.json";
const MIT_SOURCE_ID = "mit-technology-review";
const MAX_TOP_ITEMS = 5;

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith("--")) continue;

    const key = current.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractConstArray(sourceText, constName) {
  const match = sourceText.match(new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\] as const;`));

  if (!match) {
    throw new Error(`Unable to find ${constName} in donor registry`);
  }

  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

function findObjectBounds(sourceText, idIndex) {
  let start = idIndex;

  while (start >= 0 && sourceText[start] !== "{") {
    start -= 1;
  }

  if (start < 0) {
    throw new Error("Unable to find source object start");
  }

  let depth = 0;

  for (let index = start; index < sourceText.length; index += 1) {
    const character = sourceText[index];

    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;

    if (depth === 0) {
      return {
        start,
        end: index + 1,
      };
    }
  }

  throw new Error("Unable to find source object end");
}

function extractStringField(block, fieldName) {
  return block.match(new RegExp(`${fieldName}: "([^"]+)"`))?.[1] ?? null;
}

function extractNumberField(block, fieldName) {
  const value = block.match(new RegExp(`${fieldName}: ([0-9_]+)`))?.[1];

  return value ? Number(value.replaceAll("_", "")) : null;
}

function extractFeedDefinitions(repoRoot) {
  const donorRoot = path.join(repoRoot, "src/adapters/donors");
  const donorDirs = fs
    .readdirSync(donorRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(donorRoot, entry.name, "index.ts"))
    .filter((filePath) => fs.existsSync(filePath));
  const feeds = [];

  for (const filePath of donorDirs) {
    const sourceText = readText(filePath);
    const idMatches = [...sourceText.matchAll(/id: "([^"]+)"/g)];

    for (const match of idMatches) {
      const bounds = findObjectBounds(sourceText, match.index ?? 0);
      const block = sourceText.slice(bounds.start, bounds.end);
      const fetchBlock = block.match(/fetch: \{([\s\S]*?)\n\s+\}/)?.[1] ?? "";
      const feedUrl = extractStringField(fetchBlock, "feedUrl");

      if (!feedUrl) continue;

      feeds.push({
        id: match[1],
        donor: extractStringField(block, "donor"),
        source: extractStringField(block, "source"),
        status: extractStringField(block, "status"),
        availability: extractStringField(block, "availability"),
        maxItems: extractNumberField(fetchBlock, "maxItems") ?? MAX_TOP_ITEMS,
        feedUrl,
      });
    }
  }

  return feeds;
}

function sanitizeTitle(title) {
  return String(title ?? "Untitled item")
    .replace(/https?:\/\/\S+/gi, "[link]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function itemAgeHours(item, now) {
  const published = item.isoDate || item.pubDate || item.updated;
  const date = published ? new Date(published) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return Number(((now.getTime() - date.getTime()) / 36e5).toFixed(1));
}

function categoryText(categories) {
  if (typeof categories === "string") return categories;

  return (categories ?? [])
    .map((category) => {
      if (typeof category === "string") return category;
      if (category && typeof category === "object") return category._ ?? "";
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

function classifySignal(items) {
  const highSignalPatterns = [
    /\bai\b/i,
    /artificial intelligence/i,
    /robot/i,
    /cyber/i,
    /chip/i,
    /semiconductor/i,
    /climate/i,
    /energy/i,
    /science/i,
    /technology/i,
    /policy/i,
    /security/i,
  ];
  const noisyPatterns = [
    /sponsored/i,
    /alumni/i,
    /quiz/i,
    /auction/i,
    /celebrity/i,
    /sports/i,
    /recipe/i,
  ];
  const topItems = items.slice(0, MAX_TOP_ITEMS);
  const highSignalCount = topItems.filter((item) => {
    const text = `${item.title} ${item.contentSnippet ?? ""} ${categoryText(item.categories)}`;
    return highSignalPatterns.some((pattern) => pattern.test(text));
  }).length;
  const noisyCount = topItems.filter((item) => {
    const text = `${item.title} ${item.contentSnippet ?? ""} ${categoryText(item.categories)}`;
    return noisyPatterns.some((pattern) => pattern.test(text));
  }).length;

  if (topItems.length === 0) {
    return {
      judgment: "mixed",
      noisyCount,
      highSignalCount,
      note: "No MIT items were available, so automatic editorial judgment is not reliable.",
    };
  }

  if (highSignalCount >= 3 && noisyCount <= 1) {
    return {
      judgment: "mostly relevant",
      noisyCount,
      highSignalCount,
      note: "Rule-based keyword checks found several technology or policy-relevant items.",
    };
  }

  if (noisyCount >= 2) {
    return {
      judgment: "mixed",
      noisyCount,
      highSignalCount,
      note: "Rule-based checks found multiple likely noisy or off-mission items.",
    };
  }

  return {
    judgment: "mixed",
    noisyCount,
    highSignalCount,
    note: "Automatic editorial judgment is conservative; human review should confirm item quality.",
  };
}

function tokenSet(text) {
  const stopWords = new Set(
    "the a an and or of to in for on with from by is are was were be been as at that this it its into how why what who will can could should would has have had not but about new old latest live news world global".split(
      " ",
    ),
  );

  return new Set(
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !stopWords.has(token)),
  );
}

function jaccard(left, right) {
  const leftSet = tokenSet(left);
  const rightSet = tokenSet(right);
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;

  return union ? intersection / union : 0;
}

async function fetchFeedItems(parser, feed, now) {
  const parsed = await parser.parseURL(feed.feedUrl);

  return {
    title: parsed.title,
    items: (parsed.items ?? []).map((item) => ({
      title: sanitizeTitle(item.title),
      ageHours: itemAgeHours(item, now),
      categories: categoryText(item.categories),
      contentSnippet: String(item.contentSnippet ?? item.content ?? "").replace(/\s+/g, " ").slice(0, 240),
    })),
  };
}

function formatList(items) {
  if (items.length === 0) return "none observed";

  return items.map((item) => item.title).join("; ");
}

function formatFreshness(items) {
  if (items.length === 0) return "no MIT items observed";

  return items
    .map((item) => `${item.title}: ${item.ageHours === null ? "unknown age" : `${item.ageHours}h old`}`)
    .join("; ");
}

function buildDuplicationNote(mitItems, baselineItems, baselineFailures, signal) {
  if (mitItems.length === 0) {
    return "No MIT items observed; duplication risk could not be assessed.";
  }

  if (baselineItems.length === 0) {
    return "Default-feed comparison unavailable; duplication judgment is limited.";
  }

  const nearestScores = mitItems.map((mitItem) =>
    Math.max(
      ...baselineItems.map((baselineItem) =>
        jaccard(`${mitItem.title} ${mitItem.contentSnippet}`, `${baselineItem.title} ${baselineItem.contentSnippet}`),
      ),
    ),
  );
  const highOverlapCount = nearestScores.filter((score) => score >= 0.2).length;
  const failureNote =
    baselineFailures.length > 0
      ? ` ${baselineFailures.length} default comparison feed(s) were unreachable, so this is partial evidence.`
      : "";
  const noiseNote =
    signal.noisyCount > 0
      ? ` Rule-based noise flags in top MIT items: ${signal.noisyCount}.`
      : " No rule-based noise flags in top MIT items.";

  if (highOverlapCount > 0) {
    return `Possible duplicate pressure: ${highOverlapCount} top MIT item(s) had moderate title/snippet overlap with fetched default feeds.${failureNote}${noiseNote}`;
  }

  return `No obvious title/snippet duplication against fetched default feeds.${failureNote}${noiseNote}`;
}

function buildContributionUsefulness(feedReachable, topItems, signal) {
  if (!feedReachable) {
    return "not useful in this sample because the MIT feed was not reachable";
  }

  if (topItems.length === 0) {
    return "not useful in this sample because no MIT items were observed";
  }

  if (signal.judgment === "mostly relevant") {
    return "potentially useful; top MIT items include multiple technology or policy-relevant signals";
  }

  return "uncertain; MIT is contributing items, but automatic signal judgment remains conservative";
}

function buildComment(evidence) {
  return `### Review entry
- Date/time: ${evidence.checkedAt}
- Environment: production
- no-argument runtime resolution observed: ${evidence.resolutionObserved}
- probationary_runtime_source_ids: ${evidence.probationaryRuntimeSourceIds.join(", ") || "none"}
- resolved_probationary_source_ids: ${evidence.resolvedProbationarySourceIds.join(", ") || "none"}
- MIT feed reachable: ${evidence.mitFeedReachable}
- MIT item count observed: ${evidence.mitItemCountObserved}
- Top MIT item titles: ${formatList(evidence.topMitItems)}
- Freshness of top items: ${formatFreshness(evidence.topMitItems)}
- Signal quality judgment: ${evidence.signalQualityJudgment}
- Duplication/noise notes: ${evidence.duplicationNoiseNotes}
- Contribution usefulness: ${evidence.contributionUsefulness}
- Keep / remove / insufficient evidence: insufficient evidence
- Notes: ${evidence.notes}

### Decision reminder
Do not use a single entry to change source activation policy.
Collect multiple entries before deciding whether to:
- keep MIT as probationary
- remove MIT
- evaluate Foreign Affairs as the next one-source activation candidate
`;
}

async function collectEvidence({ repoRoot }) {
  const now = new Date();
  const parser = new Parser({
    timeout: 15_000,
    headers: {
      "user-agent": "daily-intelligence-mit-review/1.0",
    },
  });
  const registryText = readText(path.join(repoRoot, "src/adapters/donors/registry.ts"));
  const probationaryRuntimeSourceIds = extractConstArray(registryText, "PROBATIONARY_RUNTIME_FEED_IDS");
  const defaultDonorFeedIds = extractConstArray(registryText, "DEFAULT_DONOR_FEED_IDS");
  const feedDefinitions = extractFeedDefinitions(repoRoot);
  const feedById = new Map(feedDefinitions.map((feed) => [feed.id, feed]));
  const resolvedProbationarySourceIds = probationaryRuntimeSourceIds.filter((sourceId) => {
    const feed = feedById.get(sourceId);

    return feed?.status === "active" && feed.availability === "probationary";
  });
  const mitFeed = feedById.get(MIT_SOURCE_ID);

  if (!mitFeed) {
    throw new Error("MIT Technology Review feed is not present in existing donor adapter files");
  }

  let mitFeedReachable = "no";
  let mitItems = [];
  let mitFetchNote = "";

  try {
    const mitFeedResult = await fetchFeedItems(parser, mitFeed, now);
    mitItems = mitFeedResult.items.slice(0, mitFeed.maxItems);
    mitFeedReachable = "yes";
  } catch (error) {
    mitFetchNote = ` MIT feed fetch failed: ${error instanceof Error ? error.message : String(error)}.`;
  }

  const baselineItems = [];
  const baselineFailures = [];

  for (const sourceId of defaultDonorFeedIds) {
    const feed = feedById.get(sourceId);

    if (!feed) {
      baselineFailures.push(sourceId);
      continue;
    }

    try {
      const result = await fetchFeedItems(parser, feed, now);
      baselineItems.push(...result.items.slice(0, feed.maxItems));
    } catch {
      baselineFailures.push(sourceId);
    }
  }

  const signal = classifySignal(mitItems);
  const resolutionObserved =
    resolvedProbationarySourceIds.includes(MIT_SOURCE_ID) &&
    probationaryRuntimeSourceIds.length === 1
      ? "yes"
      : "no";
  const topMitItems = mitItems.slice(0, MAX_TOP_ITEMS);
  const notes = [
    "Automated review uses existing donor registry and adapter files plus live RSS fetches.",
    "It does not query private Vercel logs or make source-policy decisions.",
    signal.note,
    mitFetchNote.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    checkedAt: now.toISOString(),
    resolutionObserved,
    probationaryRuntimeSourceIds,
    resolvedProbationarySourceIds,
    mitFeedReachable,
    mitItemCountObserved: mitItems.length,
    topMitItems,
    signalQualityJudgment: signal.judgment,
    duplicationNoiseNotes: buildDuplicationNote(topMitItems, baselineItems, baselineFailures, signal),
    contributionUsefulness: buildContributionUsefulness(mitFeedReachable === "yes", topMitItems, signal),
    notes,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const outputPath = path.resolve(repoRoot, args.output || DEFAULT_OUTPUT_PATH);
  const jsonOutputPath = path.resolve(repoRoot, args["json-output"] || DEFAULT_JSON_OUTPUT_PATH);
  const evidence = await collectEvidence({ repoRoot });
  const comment = buildComment(evidence);

  fs.writeFileSync(outputPath, comment);
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(evidence, null, 2)}\n`);

  if (args.print === "true") {
    process.stdout.write(comment);
  }
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  process.stderr.write(`MIT probationary review failed: ${message}\n`);
  process.exit(1);
}
