export const TOUR_ORDER = [
  "pga tour",
  "european tour",
  "dp world tour",
  "asian tour",
  "sunshine tour",
  "japan golf tour",
  "japan tour",
  "korn ferry tour",
  "challenge tour",
  "canadian tour",
  "other",
];

/**
 * CSS scoped to the scraped Wikipedia content: the major-championship
 * results table (used for the off-screen capture + fallback HTML render)
 * and the "Wins by tour" table that appears inside the Wins hint.
 */
export const WIKI_CSS = `
  .wiki-capture { background:#f8f9fa; color:#202122; font-family:sans-serif; width:max-content; min-width:100%; padding:18px; border-radius:10px; border:1px solid #c8ccd1; }
  .wiki-capture h2 { margin:0 0 8px; font-size:22px; font-weight:700; border-bottom:1px solid #a2a9b1; padding-bottom:6px; }
  .wiki-capture em { display:block; color:#54595d; margin-bottom:12px; font-size:13px; }
  .wiki-capture .wikitable { width:auto; border-collapse:collapse; background:#fff; font-size:12px; margin-bottom:22px; }
  .wiki-capture .wikitable th, .wiki-capture .wikitable td { border:1px solid #a2a9b1; padding:6px 8px; text-align:center; vertical-align:middle; min-width:42px; white-space:nowrap; }
  .wiki-capture .wikitable th:first-child, .wiki-capture .wikitable td:first-child { text-align:left; min-width:190px; }
  .wiki-capture .wikitable th { background:#eaecf0; font-weight:700; }
  .wiki-capture .wikitable a { color:#36c; text-decoration:none; pointer-events:none; }

  .wiki-tour-wins table { width:100%; border-collapse:collapse; background:#fff; font-size:12px; margin-top:6px; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; }
  .wiki-tour-wins th, .wiki-tour-wins td { border-bottom:1px solid #e2e8f0; padding:6px 10px; text-align:left; vertical-align:top; }
  .wiki-tour-wins tr:last-child th, .wiki-tour-wins tr:last-child td { border-bottom:none; }
  .wiki-tour-wins th { background:#f8fafc; font-weight:600; width:65%; color:#334155; }
  .wiki-tour-wins td { text-align:right; font-variant-numeric:tabular-nums; width:35%; color:#0f172a; font-weight:600; }
`;
