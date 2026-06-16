/**
 * PGA Tour season strokes-gained category leaders.
 *
 * Curated rather than exhaustive — only entries we're confident about
 * go in here. The clue builder will surface these as "Led the PGA Tour
 * in SG: <category> (<year>)" stat clues.
 *
 * Keyed by wikiTitle → list of { year, category }.
 */
export type SgCategory =
  | "SG: Total"
  | "SG: Tee-to-Green"
  | "SG: Approach"
  | "SG: Off-the-Tee"
  | "SG: Putting"
  | "SG: Around-the-Green";

export type SgLeaderEntry = {
  year: number;
  category: SgCategory;
};

export const SG_LEADERS: Record<string, SgLeaderEntry[]> = {
  "Rory McIlroy": [
    { year: 2012, category: "SG: Total" },
    { year: 2014, category: "SG: Total" },
    { year: 2019, category: "SG: Total" },
  ],
  "Jordan Spieth": [
    { year: 2015, category: "SG: Putting" },
  ],
  "Dustin Johnson": [
    { year: 2016, category: "SG: Total" },
    { year: 2020, category: "SG: Total" },
  ],
  "Justin Thomas": [
    { year: 2017, category: "SG: Total" },
  ],
  "Jon Rahm": [
    { year: 2021, category: "SG: Total" },
  ],
  "Scottie Scheffler": [
    { year: 2022, category: "SG: Total" },
    { year: 2023, category: "SG: Total" },
    { year: 2023, category: "SG: Tee-to-Green" },
    { year: 2024, category: "SG: Total" },
    { year: 2024, category: "SG: Tee-to-Green" },
  ],
};
