#!/usr/bin/env node

import fs from "fs";
import path from "path";

const golfersFile = process.argv[2] || "src/data/golfers.ts";
const resolvedPath = path.resolve(process.cwd(), golfersFile);

if (!fs.existsSync(resolvedPath)) {
  console.error(`Could not find golfers file at: ${resolvedPath}`);
  process.exit(1);
}

const fileContents = fs.readFileSync(resolvedPath, "utf8");

// Only read the GOLFER_DATA tuple block, not acceptedAnswers arrays.
const golferDataBlockMatch = fileContents.match(
  /const\s+GOLFER_DATA\s*:\s*Array<\[string,\s*string\]>\s*=\s*\[([\s\S]*?)\];/
);

if (!golferDataBlockMatch) {
  console.error("Could not find GOLFER_DATA block in golfers.ts");
  process.exit(1);
}

const golferDataBlock = golferDataBlockMatch[1];
const golferMatches = [...golferDataBlock.matchAll(/\[\s*"([^"]+)"\s*,\s*"[^"]*"\s*\]/g)];
const golferNames = golferMatches.map((match) => match[1]);

if (!golferNames.length) {
  console.error("No golfer names found in GOLFER_DATA");
  process.exit(1);
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

async function queryTitles(titles) {
  const joined = titles.join("|");
  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      titles: joined,
      format: "json",
      origin: "*",
      redirects: "1",
    }).toString();

  const res = await fetch(url, {
    headers: {
      "User-Agent": "wiki-yellow-title-checker/1.0",
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return await res.json();
}

function buildResultMap(apiData) {
  const pages = apiData?.query?.pages || {};
  const normalized = apiData?.query?.normalized || [];
  const redirects = apiData?.query?.redirects || [];

  const normalizedMap = new Map();
  const redirectMap = new Map();

  for (const item of normalized) {
    normalizedMap.set(item.from, item.to);
  }

  for (const item of redirects) {
    redirectMap.set(item.from, item.to);
  }

  const existingTitles = new Set();
  const missingTitles = new Set();

  for (const page of Object.values(pages)) {
    if (page.missing !== undefined) {
      missingTitles.add(page.title);
    } else if (page.title) {
      existingTitles.add(page.title);
    }
  }

  return {
    normalizedMap,
    redirectMap,
    existingTitles,
    missingTitles,
  };
}

async function resolveBatch(titles) {
  const data = await queryTitles(titles);
  const resultMap = buildResultMap(data);

  return titles.map((originalTitle) => {
    const normalizedTitle = resultMap.normalizedMap.get(originalTitle) || originalTitle;
    const redirectedTitle = resultMap.redirectMap.get(originalTitle) || normalizedTitle;

    const exists =
      resultMap.existingTitles.has(originalTitle) ||
      resultMap.existingTitles.has(normalizedTitle) ||
      resultMap.existingTitles.has(redirectedTitle);

    return {
      original: originalTitle,
      exists,
      resolved: redirectedTitle,
    };
  });
}

async function tryDisambiguation(name) {
  const candidates = [`${name} (golfer)`, `${name} (golf)`];
  const checked = await resolveBatch(candidates);
  return checked.find((item) => item.exists) || null;
}

async function main() {
  console.log(`Checking ${golferNames.length} golfer names...\n`);

  const fixes = [];
  const failures = [];
  const oks = [];

  const groups = chunk(golferNames, 20);

  for (let batchIndex = 0; batchIndex < groups.length; batchIndex++) {
    const batch = groups[batchIndex];
    console.log(`Batch ${batchIndex + 1}/${groups.length}...`);

    let batchResults;
    try {
      batchResults = await resolveBatch(batch);
    } catch (err) {
      console.error(`Batch failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }

    for (const result of batchResults) {
      if (result.exists) {
        oks.push(result);
        if (result.original === result.resolved) {
          console.log(`OK    ${result.original}`);
        } else {
          console.log(`OK    ${result.original} -> ${result.resolved}`);
        }
      } else {
        const fix = await tryDisambiguation(result.original);

        if (fix) {
          fixes.push({
            original: result.original,
            resolved: fix.original,
          });
          console.log(`FIX   ${result.original} -> ${fix.original}`);
        } else {
          failures.push(result.original);
          console.log(`FAIL  ${result.original}`);
        }
      }
    }
  }

  console.log("\n==============================");
  console.log("Suggested wikiTitle fixes");
  console.log("==============================\n");

  if (!fixes.length) {
    console.log("No suggested fixes found.");
  } else {
    for (const fix of fixes) {
      console.log(`- "${fix.original}" -> "${fix.resolved}"`);
    }
  }

  console.log("\n==============================");
  console.log("Still failing");
  console.log("==============================\n");

  if (!failures.length) {
    console.log("No unresolved failures.");
  } else {
    for (const fail of failures) {
      console.log(`- "${fail}"`);
    }
  }

  console.log("\n==============================");
  console.log("Summary");
  console.log("==============================\n");
  console.log(`OK: ${oks.length}`);
  console.log(`Suggested fixes: ${fixes.length}`);
  console.log(`Failures: ${failures.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});