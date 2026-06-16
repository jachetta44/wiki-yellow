import { GOLFERS } from "@/data/golfers";
import { Golfer } from "@/components/types";

/**
 * Modern daily pool — golfers whose prime years fell in 2012-2026.
 *
 * Filters the full GOLFERS list down to players recognizable to someone
 * who's been following the PGA Tour / DP World Tour over the last ~14
 * years. Classic-era legends (Nicklaus, Palmer, Faldo, Seve, etc.) are
 * excluded so the daily puzzle doesn't lean on majors-grid pattern
 * recognition the way classic mode does.
 *
 * Keyed by wikiTitle so we stay in sync with GOLFERS overrides.
 */
const MODERN_WIKI_TITLES = new Set<string>([
  "Rory McIlroy",
  "Jordan Spieth",
  "Dustin Johnson",
  "Brooks Koepka",
  "Rickie Fowler",
  "Xander Schauffele",
  "Collin Morikawa",
  "Viktor Hovland",
  "Tommy Fleetwood",
  "Hideki Matsuyama",
  "Justin Thomas",
  "Jon Rahm",
  "Bryson DeChambeau",
  "Jason Day",
  "Shane Lowry",
  "Wyndham Clark",
  "Brian Harman",
  "Keegan Bradley",
  "Justin Rose",
  "Patrick Reed",
  "Tony Finau",
  "Patrick Cantlay",
  "Im Sung-jae",
  "Will Zalatoris",
  "Matt Fitzpatrick",
  "Cameron Smith (golfer)",
  "Adam Scott (golfer)",
  "Louis Oosthuizen",
  "Henrik Stenson",
  "Ludvig Åberg",
  "Cameron Young",
  "Scottie Scheffler",
  "J. J. Spaun",
  "Webb Simpson",
  "Sergio García",
  "Bubba Watson",
  "Francesco Molinari",
  "Gary Woodland",
  "Matt Kuchar",
  "Brandt Snedeker",
  "Danny Willett",
  "Jimmy Walker (golfer)",
  "Jason Dufner",
  "Zach Johnson",
  "Graeme McDowell",
  "Martin Kaymer",
  "Hunter Mahan",
]);

export const MODERN_DAILY_POOL: Golfer[] = GOLFERS.filter((g) =>
  MODERN_WIKI_TITLES.has(g.wikiTitle)
);
