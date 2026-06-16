/**
 * Manifest of available swing-silhouette assets, keyed by wikiTitle.
 * Each value is a public-relative path to a looped silhouette clip
 * (webm / webp / gif) under `public/swings/`.
 *
 * The asset pipeline (scripts/build-swings.py) writes clips to
 * `public/swings/<slug>.webm` — add an entry here once a clip lands.
 * When a golfer has no entry, the clue strip shows a "coming soon"
 * placeholder so the slot still reads as a swing-silhouette card.
 *
 * Files here are intentionally tiny (~250KB each, 2-3 second loops,
 * black silhouette on a flat background) so the page loads fast.
 */
export const SWING_SILHOUETTES: Record<string, string> = {
  // "Scottie Scheffler": "/swings/scottie-scheffler.webm",
  // "Rory McIlroy":       "/swings/rory-mcilroy.webm",
  // "Jordan Spieth":      "/swings/jordan-spieth.webm",
  // "Hideki Matsuyama":   "/swings/hideki-matsuyama.webm",
};

/**
 * Look up the silhouette asset for a golfer, if any.
 */
export function getSwingSilhouetteUrl(wikiTitle: string): string | null {
  return SWING_SILHOUETTES[wikiTitle] ?? null;
}
