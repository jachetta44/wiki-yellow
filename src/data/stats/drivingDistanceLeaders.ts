/**
 * PGA Tour season-long driving-distance leaders.
 *
 * Keyed by wikiTitle; value is list of years that player led the Tour
 * in driving distance. Only includes entries we're confident about —
 * curated rather than comprehensive.
 */
export const DRIVING_DISTANCE_LEADERS: Record<string, number[]> = {
  "Bubba Watson": [2012],
  "Dustin Johnson": [2015],
  "Rory McIlroy": [2017],
  "Cameron Champ": [2019],
  "Bryson DeChambeau": [2020, 2021],
};
