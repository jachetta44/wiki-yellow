import { MetaInfo } from "@/components/types";
import { cleanText, formatHeightWeight } from "@/lib/helpers";

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

  return {
    height,
    weight,
    heightWeight: formatHeightWeight(height, weight),
    tourWins,
    nationality,
    topRanking,
    imageUrl: imageSrc ? `https:${imageSrc}` : null,
    infoboxFound: Boolean(infobox),
  };
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
