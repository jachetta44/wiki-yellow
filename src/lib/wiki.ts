import { MetaInfo } from "@/components/types";
import { lookupMajorVenue } from "@/data/majorVenues";
import { cleanText, formatHeightWeight } from "@/lib/helpers";

// ---------- Signature events (for daily puzzle) ----------
// Ordered non-major events that commonly have per-year result tables on
// golfer Wikipedia pages. The daily puzzle rotates through these so the
// visual isn't the same "majors grid" as classic mode.
export type SignatureEvent = {
  id: string;
  label: string;
  shortLabel: string;
  // Heading text phrases to hunt for (compared lowercased via `includes`)
  headingMatches: string[];
  // Wikipedia anchor IDs to try first as an exact hit
  anchorIds: string[];
  // Scoring keywords for table content (increases confidence it's the right table)
  scoringKeywords: string[];
};

export const SIGNATURE_EVENTS: SignatureEvent[] = [
  {
    id: "players",
    label: "The Players Championship",
    shortLabel: "The Players",
    headingMatches: ["the players championship", "players championship"],
    anchorIds: ["The_Players_Championship", "Players_Championship"],
    scoringKeywords: ["players", "sawgrass", "tpc"],
  },
  {
    id: "wgc",
    label: "World Golf Championships",
    shortLabel: "WGC",
    headingMatches: [
      "world golf championships",
      "results in world golf championships",
    ],
    anchorIds: [
      "World_Golf_Championships",
      "Results_in_World_Golf_Championships",
    ],
    scoringKeywords: ["wgc", "match play", "invitational", "hsbc", "bridgestone"],
  },
  {
    id: "tour-championship",
    label: "Tour Championship (FedEx Cup)",
    shortLabel: "Tour Championship",
    headingMatches: [
      "tour championship",
      "fedex cup playoffs",
      "fedex cup",
    ],
    anchorIds: ["Tour_Championship", "FedEx_Cup", "FedEx_Cup_playoffs"],
    scoringKeywords: [
      "east lake",
      "fedex",
      "tour championship",
      "bmw championship",
      "northern trust",
      "dell technologies",
    ],
  },
];

export function scoreEventTable(
  table: Element,
  keywords: string[]
): number {
  const text = cleanText(table.textContent).toLowerCase();
  const kwHits = keywords.filter((k) => text.includes(k)).length;
  const hasYears = /\b(19|20)\d{2}\b/.test(text) ? 4 : 0;
  const hasResults = /(cut|wd|t\d+|\bwin\b|\bwon\b|\bdnp\b)/i.test(text) ? 3 : 0;
  return kwHits * 6 + hasYears + hasResults;
}

export function findEventTable(
  doc: Document,
  event: SignatureEvent
): Element | null {
  const collectFromHeading = (heading: Element | null | undefined): Element | null => {
    if (!heading) return null;
    let node = heading.nextElementSibling;
    let steps = 0;
    while (node && steps < 20) {
      if (node.matches?.("h2, h3, h4, .mw-heading")) break;
      const candidates = [
        ...(node.matches?.("table") ? [node] : []),
        ...Array.from(node.querySelectorAll?.("table") || []),
      ];
      for (const table of candidates) {
        if (scoreEventTable(table, event.scoringKeywords) >= 10) return table;
      }
      node = node.nextElementSibling;
      steps += 1;
    }
    return null;
  };

  // 1. Try exact anchor IDs
  for (const anchorId of event.anchorIds) {
    const anchor = doc.getElementById(anchorId);
    const section = anchor?.closest("section, h2, h3, h4, .mw-heading") || anchor;
    const hit = collectFromHeading(section);
    if (hit) return hit;
  }

  // 2. Fall back to heading-text search
  for (const heading of Array.from(doc.querySelectorAll("h2, h3, h4, .mw-heading"))) {
    const text = cleanText(heading.textContent).toLowerCase();
    if (!event.headingMatches.some((phrase) => text.includes(phrase))) continue;
    const hit = collectFromHeading(heading);
    if (hit) return hit;
  }

  // 3. Last-ditch: any table on the page with very high keyword density
  const all = Array.from(doc.querySelectorAll("table.wikitable, table"));
  let best: { table: Element; score: number } | null = null;
  for (const table of all) {
    const score = scoreEventTable(table, event.scoringKeywords);
    if (score >= 18 && (!best || score > best.score)) {
      best = { table, score };
    }
  }
  return best?.table || null;
}

/**
 * Parse the PGA Tour wins table into a year-by-year win count. Used by
 * the wins-timeline bar chart clue. Returns a list of { year, count }
 * covering the first win year through the last win year (including
 * zero-win years so the chart reads as a career arc).
 */
export function extractPgaWinsByYear(
  doc: Document
): { year: number; count: number }[] {
  const table = findPgaTourWinsTable(doc);
  if (!table) return [];

  const rows = Array.from(table.querySelectorAll("tbody tr, tr"));
  const byYear = new Map<number, number>();

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (!cells.length) continue;
    // Dates appear somewhere in the first ~3 cells; pull any 4-digit year.
    const blob = Array.from(cells).slice(0, 3).map((c) => cleanText(c.textContent || "")).join(" ");
    const match = blob.match(/\b(19\d{2}|20\d{2})\b/);
    if (!match) continue;
    const year = Number(match[1]);
    byYear.set(year, (byYear.get(year) || 0) + 1);
  }

  if (byYear.size === 0) return [];

  const minYear = Math.min(...byYear.keys());
  const maxYear = Math.max(...byYear.keys());
  const out: { year: number; count: number }[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    out.push({ year: y, count: byYear.get(y) || 0 });
  }
  return out;
}

/**
 * Find team-appearance counts (Ryder Cup, Presidents Cup) from the
 * "Team appearances" section. We don't try to parse win-loss-half
 * records — just appearance counts, which are structurally the easiest
 * bit and already a good clue.
 */
export function extractTeamAppearances(
  doc: Document
): { ryderCup: number | null; presidentsCup: number | null } {
  const result = { ryderCup: null as number | null, presidentsCup: null as number | null };

  const headings = Array.from(doc.querySelectorAll("h2, h3, h4, .mw-heading"));
  for (const heading of headings) {
    const text = cleanText(heading.textContent).toLowerCase();
    if (!text.includes("team appearances")) continue;

    // Scan forward looking for list items of the form
    // "Ryder Cup: 2010, 2012, 2014 (winners), 2016" etc.
    let node = heading.nextElementSibling;
    let steps = 0;
    while (node && steps < 12) {
      if (node.matches?.("h2, h3, h4, .mw-heading")) break;
      const items = [
        ...(node.matches?.("li") ? [node] : []),
        ...Array.from(node.querySelectorAll?.("li") || []),
      ];
      for (const li of items) {
        const content = cleanText(li.textContent || "");
        const lower = content.toLowerCase();
        // Each year appearance is one "YYYY" token in the right half of the line.
        const colonIdx = content.indexOf(":");
        const tail = colonIdx >= 0 ? content.slice(colonIdx + 1) : content;
        const years = (tail.match(/\b(19\d{2}|20\d{2})\b/g) || []).length;
        if (lower.startsWith("ryder cup") && result.ryderCup === null && years > 0) {
          result.ryderCup = years;
        } else if (
          lower.startsWith("presidents cup") &&
          result.presidentsCup === null &&
          years > 0
        ) {
          result.presidentsCup = years;
        }
      }
      node = node.nextElementSibling;
      steps += 1;
    }
    if (result.ryderCup !== null || result.presidentsCup !== null) break;
  }

  return result;
}

/**
 * Pull the nickname out of the Wikipedia lead paragraph, if any. Typical
 * pattern: "John Patrick Rahm Rodríguez, known professionally as Jon
 * Rahm..." or "...nicknamed 'The Scientist'..." or first-para quote.
 */
export function extractNickname(doc: Document): string | null {
  const leadPara = doc.querySelector("p");
  if (!leadPara) return null;
  const text = cleanText(leadPara.textContent || "");
  const quoted = text.match(/(?:nicknamed|known as|called)\s+['"“”]([^'"“”]{2,40})['"“”]/i);
  if (quoted) return quoted[1];
  return null;
}

/**
 * Find the "PGA Tour wins (N)" table, which usually lives inside a
 * <h2>Professional wins</h2> section with columns like No. / Date /
 * Tournament / Winning score / Margin / Runner(s)-up. Skips the
 * "PGA Tour Champions wins" lookalike header.
 */
export function findPgaTourWinsTable(doc: Document): Element | null {
  const headings = Array.from(doc.querySelectorAll("h2, h3, h4, .mw-heading"));
  for (const heading of headings) {
    const text = cleanText(heading.textContent).toLowerCase();
    if (!text.includes("pga tour wins")) continue;
    if (text.includes("champions")) continue; // senior tour wins — skip

    let node = heading.nextElementSibling;
    let steps = 0;
    while (node && steps < 10) {
      if (node.matches?.("h2, h3, h4, .mw-heading")) break;
      const candidates = [
        ...(node.matches?.("table") ? [node] : []),
        ...Array.from(node.querySelectorAll?.("table") || []),
      ];
      for (const table of candidates) {
        const body = cleanText(table.textContent).toLowerCase();
        if (/tournament/.test(body) && (/date/.test(body) || /winning score/.test(body))) {
          return table;
        }
      }
      node = node.nextElementSibling;
      steps += 1;
    }
  }
  return null;
}

export function cleanSingleTableHtml(table: Element): string {
  const clone = table.cloneNode(true) as Element;

  clone
    .querySelectorAll(
      "sup.reference, .mw-editsection, .reference, .sortkey, style, script, .mw-cite-backlink"
    )
    .forEach((el) => el.remove());

  clone.querySelectorAll("a").forEach((a) => {
    a.removeAttribute("href");
    a.removeAttribute("title");
  });

  clone.querySelectorAll("span, small, sup").forEach((node) => {
    const text = cleanText(node.textContent || "");
    if (!text) node.remove();
    else node.textContent = text;
  });

  return clone.outerHTML;
}

export function scoreMajorTable(table: Element): number {
  const text = cleanText(table.textContent).toLowerCase();
  const hits = [
    "masters",
    "u.s. open",
    "us open",
    "the open championship",
    "open championship",
    "pga championship",
  ].filter((x) => text.includes(x)).length;

  return (
    hits * 10 +
    (text.includes("tournament") || text.includes("year") ? 2 : 0) +
    (/(cut|wd|nt|dnq|t\d+|\b\d+\b)/i.test(text) ? 1 : 0)
  );
}

export function findMajorTables(doc: Document): Element[] {
  const allTables = Array.from(doc.querySelectorAll("table.wikitable, table"));
  const headings = [
    "major championships",
    "major championship",
    "performance in majors",
    "results timeline",
    "major results",
    "major championship results",
    "championships and results timeline",
  ];

  const collectAfter = (heading: Element | null | undefined): Element[] => {
    const found: Element[] = [];
    let node = heading?.nextElementSibling;
    let steps = 0;

    while (node && steps < 30) {
      if (node.matches?.("h2, h3, h4, .mw-heading")) break;

      const candidateTables = [
        ...(node.matches?.("table") ? [node] : []),
        ...Array.from(node.querySelectorAll?.("table") || []),
      ];

      for (const table of candidateTables) {
        if (scoreMajorTable(table) >= 30) found.push(table);
      }

      node = node.nextElementSibling;
      steps += 1;
    }

    return Array.from(new Set(found));
  };

  const exactAnchor = doc.querySelector(
    "#Major_championships, #Major_championship_results, #Performance_in_majors, #Results_timeline, #Championships_and_results_timeline"
  );

  const anchored = collectAfter(exactAnchor?.closest("section, h2, h3, h4, .mw-heading"));
  if (anchored.length) return anchored;

  for (const heading of Array.from(doc.querySelectorAll("h2, h3, h4, .mw-heading"))) {
    const text = cleanText(heading.textContent).toLowerCase();
    if (!headings.some((phrase) => text.includes(phrase))) continue;
    const found = collectAfter(heading);
    if (found.length) return found;
  }

  return allTables.filter((table) => scoreMajorTable(table) >= 30);
}

export function cleanTablesHtml(tables: Element[]): string {
  return tables
    .map((table) => {
      const clone = table.cloneNode(true) as Element;

      clone
        .querySelectorAll(
          "sup.reference, .mw-editsection, .reference, .sortkey, style, script, .mw-cite-backlink"
        )
        .forEach((el) => el.remove());

      clone.querySelectorAll("a").forEach((a) => {
        a.removeAttribute("href");
        a.removeAttribute("title");
      });

      clone.querySelectorAll("span, small, sup").forEach((node) => {
        const text = cleanText(node.textContent || "");
        if (!text) node.remove();
        else node.textContent = text;
      });

      return clone.outerHTML;
    })
    .join("");
}

function cleanNodeForHintTable(node: Element): Element {
  const clone = node.cloneNode(true) as Element;

  clone
    .querySelectorAll(
      "sup.reference, .mw-editsection, .reference, .sortkey, style, script, .mw-cite-backlink"
    )
    .forEach((el) => el.remove());

  clone.querySelectorAll("a").forEach((a) => {
    a.removeAttribute("href");
    a.removeAttribute("title");
  });

  clone.querySelectorAll("span, small, sup").forEach((child) => {
    const text = cleanText(child.textContent || "");
    if (!text) child.remove();
    else child.textContent = text;
  });

  return clone;
}

function buildWinsByTourHtml(rows: HTMLTableRowElement[]): string | null {
  if (!rows.length) return null;

  const tableRows = rows
    .map((row) => {
      const clonedRow = cleanNodeForHintTable(row);
      return clonedRow.outerHTML;
    })
    .join("");

  return `
    <div class="wiki-tour-wins">
      <table>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;
}

function buildWinsByTourFromCell(header: string, td: Element | null | undefined): string | null {
  if (!td) return null;

  const clone = cleanNodeForHintTable(td);
  const html = (clone.innerHTML || "").trim();
  const text = cleanText(clone.textContent || "");
  if (!html || !text) return null;

  const lower = text.toLowerCase();
  const hasStructuredBreakdown =
    clone.querySelector("table, ul, ol, dl, div, br") ||
    /(pga tour|european tour|dp world tour|asian tour|sunshine tour|japan golf tour|japan tour|korn ferry tour|challenge tour|canadian tour|other)/i.test(
      lower
    );

  if (!hasStructuredBreakdown) return null;

  return `
    <div class="wiki-tour-wins">
      <div class="wiki-tour-wins-title">${header}</div>
      <div class="wiki-tour-wins-body">${html}</div>
    </div>
  `;
}

export function extractInfoboxData(doc: Document): MetaInfo {
  const infobox = doc.querySelector("table.infobox, table[class*='infobox']");
  const rows = Array.from(infobox?.querySelectorAll("tr") || []) as HTMLTableRowElement[];

  const rowFor = (regex: RegExp) => {
    const row = rows.find((r) => regex.test(cleanText(r.querySelector("th")?.textContent)));
    if (!row) return null;

    const th = row.querySelector("th");
    const td = row.querySelector("td");

    return {
      row,
      header: cleanText(th?.textContent || ""),
      text: cleanText(td?.textContent || ""),
      td,
    };
  };

  const height = rowFor(/^height$/i)?.text || rowFor(/height/i)?.text || null;
  const weight = rowFor(/^weight$/i)?.text || rowFor(/weight/i)?.text || null;
  const born = rowFor(/born/i)?.text || null;

  const bornParts = born
  ? born.split(",").map((x) => x.trim()).filter(Boolean)
  : [];

const nationality =
  rowFor(/nationality|country/i)?.text ||
  (bornParts.length ? bornParts[bornParts.length - 1] : null);

  const rankingText = rowFor(/highest ranking|world ranking/i)?.text || null;

  // Pull any 4-digit year in the ranking cell, e.g. "World No. 1 (May 2022)".
  // We only trust results between 1986 (OWGR start) and now.
  const topRankingYear = (() => {
    if (!rankingText) return null;
    const yearMatches = rankingText.match(/\b(19[89]\d|20\d{2})\b/g);
    if (!yearMatches || !yearMatches.length) return null;
    const year = Number(yearMatches[0]);
    const now = new Date().getFullYear();
    if (year < 1986 || year > now) return null;
    return year;
  })();

  const topRanking = (() => {
    if (!rankingText) {
      const bornYearMatch = born?.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
      const bornYear = bornYearMatch ? Number(bornYearMatch[1]) : null;
  
      // OWGR started in 1986. Older-era players often have no ranking row at all.
      if (bornYear && bornYear <= 1955) {
        return "Predates OWGR";
      }
  
      return null;
    }
  
    const cleanedRanking = cleanText(rankingText);
  
    const explicitMatch = cleanedRanking.match(
      /(?:former\s+)?world\s*(?:number|no\.?)\s*(\d{1,2})/i
    );
    if (explicitMatch) {
      const rank = Number(explicitMatch[1]);
      return `World No. ${rank}`;
    }
  
    const standaloneMatch = cleanedRanking.match(/^(\d{1,2})$/);
    if (standaloneMatch) {
      const rank = Number(standaloneMatch[1]);
      return `World No. ${rank}`;
    }
  
    const leadingNumberMatch = cleanedRanking.match(/^(\d{1,2})(?:\s*\(|\s|$)/);
    if (leadingNumberMatch) {
      const rank = Number(leadingNumberMatch[1]);
      if (rank >= 1 && rank <= 50) return `World No. ${rank}`;
    }
  
    return null;
  })();

  const winsSectionRow = rowFor(/^number of wins by tour$/i) || rowFor(/number of wins by tour/i);

  const normalizedTourLabel = (text: string): boolean => {
    const lower = text.toLowerCase().trim();

    return [
      "pga tour",
      "european tour",
      "dp world tour",
      "asian tour",
      "pga tour of australasia",
      "sunshine tour",
      "japan golf tour",
      "japan tour",
      "korn ferry tour",
      "challenge tour",
      "canadian tour",
      "other",
    ].some((label) => lower === label || lower.includes(label));
  };

  const isStopHeader = (header: string) =>
    /achievements? and awards?|awards?|honours?|honors?|best results in major championships|highest ranking|former tour\(s\)|current tour\(s\)|personal information/i.test(
      header
    );

  let tourWins: string | null = null;

  if (winsSectionRow?.row) {
    tourWins = buildWinsByTourFromCell(winsSectionRow.header || "Number of wins by tour", winsSectionRow.td);

    if (!tourWins) {
      const sectionRows: HTMLTableRowElement[] = [];
      sectionRows.push(cleanNodeForHintTable(winsSectionRow.row) as HTMLTableRowElement);

      let cursor = winsSectionRow.row.nextElementSibling as HTMLTableRowElement | null;

      while (cursor) {
        const thText = cleanText(cursor.querySelector("th")?.textContent || "");
        const tdCells = Array.from(cursor.querySelectorAll("td")).map((cell) =>
          cleanText(cell.textContent || "")
        );

        if (thText && isStopHeader(thText)) break;

        const firstCell = thText || tdCells[0] || "";
        const looksLikeTourRow = normalizedTourLabel(firstCell);

        if (looksLikeTourRow) {
          sectionRows.push(cursor);
          cursor = cursor.nextElementSibling as HTMLTableRowElement | null;
          continue;
        }

        if (sectionRows.length > 1) break;

        cursor = cursor.nextElementSibling as HTMLTableRowElement | null;
      }

      if (sectionRows.length > 1) {
        tourWins = buildWinsByTourHtml(sectionRows);
      }
    }
  }

  const imageSrc = infobox?.querySelector("img")?.getAttribute("src");

  // Extra stat-stack fields for the daily puzzle.
  const bornYearMatch = born?.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
  const bornYear = bornYearMatch ? Number(bornYearMatch[1]) : null;

  const turnedProRaw =
    rowFor(/turned professional|turned pro/i)?.text || null;
  const turnedPro = turnedProRaw ? turnedProRaw.replace(/\s*\(.*?\)\s*/g, "").trim() || null : null;

  const collegeRaw = rowFor(/^college$|education/i)?.text || null;
  const college = collegeRaw ? collegeRaw.split("(")[0].trim() || null : null;

  // "Professional wins" infobox row typically reads like "48" or "48 (4 on PGA Tour...)".
  const proWinsRaw = rowFor(/^professional wins$|^pro wins$/i)?.text || null;
  const proWinsMatch = proWinsRaw?.match(/^\s*(\d{1,3})/);
  const proWinsTotal = proWinsMatch ? proWinsMatch[1] : null;

  // Amateur wins / amateur career — sometimes in a "Amateur wins" row,
  // sometimes a "Former U.S. Amateur champion (2013)"-style note.
  const amateurWinsRaw = rowFor(/^amateur wins$/i)?.text || null;
  const amateurWins = amateurWinsRaw
    ? amateurWinsRaw.replace(/\s*\(.*?\)\s*/g, "").trim() || null
    : null;

  return {
    height,
    weight,
    heightWeight: formatHeightWeight(height, weight),
    tourWins,
    nationality,
    topRanking,
    topRankingYear,
    imageUrl: imageSrc ? `https:${imageSrc}` : null,
    infoboxFound: Boolean(infobox),
    bornYear,
    turnedPro,
    college,
    proWinsTotal,
    amateurWins,
  };
}

export type LastMajorWin = {
  tournament: string;
  course: string;   // populated from static venue lookup
  location: string; // populated from static venue lookup
  year: number;
  onlyMasters: boolean;
};

/**
 * Parse the PGA Tour wins table looking for major championship entries.
 * Returns the most recent major win with the venue, plus a flag indicating
 * whether every major win on record is The Masters (so the UI can add a
 * witty "always Augusta" note).
 */
export function extractLastMajorWin(doc: Document): LastMajorWin | null {
  const table = findPgaTourWinsTable(doc);
  if (!table) return null;

  const rows = Array.from(table.querySelectorAll("tr"));
  if (!rows.length) return null;

  // Detect column indices from the header row.
  const headerCells = Array.from(rows[0].querySelectorAll("th, td")).map(
    (el) => cleanText(el.textContent || "").toLowerCase()
  );
  const dateIdx = headerCells.findIndex((h) => h.includes("date"));
  const tournamentIdx = headerCells.findIndex((h) => h.includes("tournament"));

  if (tournamentIdx === -1) return null;

  const MAJOR_MAP: { pattern: RegExp; label: string }[] = [
    { pattern: /masters/i, label: "The Masters" },
    { pattern: /u\.?s\.?\s*open/i, label: "U.S. Open" },
    { pattern: /open championship/i, label: "The Open Championship" },
    { pattern: /pga championship/i, label: "PGA Championship" },
  ];

  const majorWins: { tournament: string; year: number }[] = [];

  for (const row of rows.slice(1)) {
    const cells = Array.from(row.querySelectorAll("td"));
    if (cells.length < 2) continue;

    const safeCellText = (idx: number) =>
      idx >= 0 && cells[idx] ? cleanText(cells[idx].textContent || "") : "";

    const tournamentText = safeCellText(tournamentIdx);
    const major = MAJOR_MAP.find((m) => m.pattern.test(tournamentText));
    if (!major) continue;

    const dateText = safeCellText(dateIdx);
    const blob = [dateText, safeCellText(0), safeCellText(1)].join(" ");
    const yearMatch = blob.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : 0;
    if (!year) continue;

    majorWins.push({ tournament: major.label, year });
  }

  if (!majorWins.length) return null;

  majorWins.sort((a, b) => b.year - a.year);
  const last = majorWins[0];
  const onlyMasters = majorWins.every((w) => w.tournament === "The Masters");

  const venue = lookupMajorVenue(last.tournament, last.year);

  return {
    tournament: last.tournament,
    year: last.year,
    course: venue?.course ?? "",
    location: venue?.location ?? "",
    onlyMasters,
  };
}

export type BestMajorResult = {
  tournament: string;
  position: string;
  year: number;
};

function parseMajorPosition(text: string): number {
  const s = text.trim();
  if (/^(won|1st?|1)$/i.test(s)) return 1;
  const m = s.match(/^t?(\d+)$/i);
  if (m) return parseInt(m[1], 10);
  return 999;
}

/**
 * Scan the major championship results grid for the best non-win finish.
 * Used as a fallback when the player has no major wins at all.
 */
export function extractBestMajorResult(doc: Document): BestMajorResult | null {
  const tables = findMajorTables(doc);

  const MAJOR_MAP: { pattern: RegExp; label: string }[] = [
    { pattern: /masters/i, label: "The Masters" },
    { pattern: /u\.?s\.?\s*open/i, label: "U.S. Open" },
    { pattern: /open championship|british open/i, label: "The Open Championship" },
    { pattern: /pga championship/i, label: "PGA Championship" },
  ];

  let best: BestMajorResult | null = null;
  let bestPos = 999;

  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll("tr"));
    if (rows.length < 2) continue;

    const headerCells = Array.from(rows[0].querySelectorAll("th, td")).map(
      (el) => cleanText(el.textContent || "")
    );

    for (const row of rows.slice(1)) {
      const cells = Array.from(row.querySelectorAll("th, td"));
      if (!cells.length) continue;

      const firstText = cleanText(cells[0].textContent || "");
      const major = MAJOR_MAP.find((m) => m.pattern.test(firstText));
      if (!major) continue;

      for (let i = 1; i < cells.length && i < headerCells.length; i++) {
        const val = cleanText(cells[i].textContent || "");
        const pos = parseMajorPosition(val);
        if (pos > 1 && pos < bestPos) {
          const yearMatch = headerCells[i].match(/\b(19\d{2}|20\d{2})\b/);
          if (yearMatch) {
            bestPos = pos;
            best = { tournament: major.label, position: val.trim(), year: parseInt(yearMatch[1], 10) };
          }
        }
      }
    }
  }

  return best;
}

export async function fetchWikiMarkup(title: string): Promise<string> {
  const errors: string[] = [];

  try {
    const parseUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
      title
    )}&prop=text&formatversion=2&format=json&origin=*`;

    const res = await fetch(parseUrl, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Wikipedia parse API failed (${res.status}).`);

    const data = await res.json();
    if (!data?.parse?.text) throw new Error("Wikipedia parse API returned no page HTML.");

    return data.parse.text;
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Parse API failed.");
  }

  try {
    const pageUrl = `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(
      title
    )}&mobileaction=toggle_view_mobile`;

    const res = await fetch(pageUrl);
    if (!res.ok) throw new Error(`Wikipedia page fetch failed (${res.status}).`);

    return await res.text();
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Direct page fetch failed.");
  }

  throw new Error(errors.join(" "));
}
