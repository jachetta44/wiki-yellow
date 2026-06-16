import { Clue } from "./types";
import { Golfer, MetaInfo } from "@/components/types";
import { FEDEX_CUP_WINS } from "@/data/stats/fedexCupWinners";
import { PLAYER_OF_THE_YEAR } from "@/data/stats/playerOfTheYear";
import { DRIVING_DISTANCE_LEADERS } from "@/data/stats/drivingDistanceLeaders";
import { SG_LEADERS } from "@/data/stats/sgLeaders";
import { SIGNATURE_MOMENTS } from "@/data/stats/signatureMoments";
import { getSwingSilhouetteUrl } from "@/data/swingSilhouettes";
import { LastMajorWin } from "@/lib/wiki";

/**
 * Inputs a clue builder can lean on. Everything is optional — each
 * builder decides whether it has enough to emit a Clue.
 */
export type CluePoolInput = {
  golfer: Golfer;
  meta: MetaInfo;
  ryderCup: number | null;
  presidentsCup: number | null;
  nickname: string | null;
  pgaWinsByYear: { year: number; count: number }[];
  lastMajorWin: LastMajorWin | null;
  // Whether the hero visual is already showing PGA Tour wins. If so, we
  // skip the wins-chart clue to avoid duplication.
  heroIsPgaWins: boolean;
};

/**
 * Best-effort flag emoji map. The Wikipedia "nationality" row is
 * unstructured free text, so we match on substrings. Unknown → no flag
 * (we fall back to the white-flag default in ClueCard).
 */
const FLAG_MAP: { match: RegExp; emoji: string; label: string }[] = [
  { match: /united states|american|\busa\b|\bu\.s\.?\b/i, emoji: "🇺🇸", label: "United States" },
  { match: /northern ireland/i, emoji: "🇬🇧", label: "Northern Ireland" },
  { match: /\bireland\b|irish/i, emoji: "🇮🇪", label: "Ireland" },
  { match: /england|english/i, emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", label: "England" },
  { match: /scotland|scottish/i, emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", label: "Scotland" },
  { match: /wales|welsh/i, emoji: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", label: "Wales" },
  { match: /united kingdom|british|\buk\b/i, emoji: "🇬🇧", label: "United Kingdom" },
  { match: /australia/i, emoji: "🇦🇺", label: "Australia" },
  { match: /new zealand/i, emoji: "🇳🇿", label: "New Zealand" },
  { match: /south africa/i, emoji: "🇿🇦", label: "South Africa" },
  { match: /\bspain\b|spanish/i, emoji: "🇪🇸", label: "Spain" },
  { match: /italy|italian/i, emoji: "🇮🇹", label: "Italy" },
  { match: /german/i, emoji: "🇩🇪", label: "Germany" },
  { match: /\bfrance\b|french/i, emoji: "🇫🇷", label: "France" },
  { match: /swede|sweden/i, emoji: "🇸🇪", label: "Sweden" },
  { match: /norway|norwegian/i, emoji: "🇳🇴", label: "Norway" },
  { match: /denmark|danish/i, emoji: "🇩🇰", label: "Denmark" },
  { match: /finland|finn/i, emoji: "🇫🇮", label: "Finland" },
  { match: /japan/i, emoji: "🇯🇵", label: "Japan" },
  { match: /korea/i, emoji: "🇰🇷", label: "South Korea" },
  { match: /canad/i, emoji: "🇨🇦", label: "Canada" },
  { match: /mexic/i, emoji: "🇲🇽", label: "Mexico" },
  { match: /argentin/i, emoji: "🇦🇷", label: "Argentina" },
  { match: /fiji/i, emoji: "🇫🇯", label: "Fiji" },
  { match: /thai/i, emoji: "🇹🇭", label: "Thailand" },
  { match: /chinese taipei|taiwan/i, emoji: "🇹🇼", label: "Chinese Taipei" },
];

function resolveFlag(
  nationality: string | null
): { emoji?: string; country: string } | null {
  if (!nationality) return null;
  for (const entry of FLAG_MAP) {
    if (entry.match.test(nationality)) {
      return { emoji: entry.emoji, country: entry.label };
    }
  }
  // If we can't map to a known country, fall back to the raw string (no
  // emoji) so the card still renders something useful.
  return { country: nationality };
}

// ---------- Individual builders ----------

function buildBuildStat(input: CluePoolInput): Clue | null {
  if (!input.meta.heightWeight) return null;
  return {
    kind: "stat",
    label: "Build",
    value: input.meta.heightWeight,
    accent: "default",
    difficulty: 5, // very generic — good to surface first
  };
}

function buildCareerTimingClue(input: CluePoolInput): Clue | null {
  const { turnedPro, bornYear } = input.meta;
  if (!turnedPro && !bornYear) return null;
  const parts: string[] = [];
  if (bornYear) parts.push(`Born ${bornYear}`);
  if (turnedPro) parts.push(`Turned pro ${turnedPro}`);
  return {
    kind: "text",
    label: "Career timing",
    value: parts.join(" · "),
    difficulty: 4,
  };
}

function buildCollegeClue(input: CluePoolInput): Clue | null {
  if (!input.meta.college) return null;
  return {
    kind: "stat",
    label: "College",
    value: input.meta.college,
    accent: "sky",
    difficulty: 4,
  };
}

/**
 * The "first slot" clue in the fixed daily order: college if known,
 * otherwise amateur-wins summary, otherwise a turned-pro timing card.
 * Returns a placeholder when nothing is available so the slot still
 * reads coherently.
 */
function buildCollegeOrAmateurClue(input: CluePoolInput): Clue {
  if (input.meta.college) {
    return {
      kind: "stat",
      label: "College",
      value: input.meta.college,
      accent: "sky",
      difficulty: 5,
    };
  }
  if (input.meta.amateurWins) {
    return {
      kind: "stat",
      label: "Amateur career",
      value: `${input.meta.amateurWins} amateur win${
        input.meta.amateurWins === "1" ? "" : "s"
      }`,
      accent: "sky",
      difficulty: 5,
    };
  }
  if (input.meta.turnedPro) {
    return {
      kind: "stat",
      label: "Turned pro",
      value: input.meta.turnedPro,
      secondary: "No college / amateur record on file",
      accent: "sky",
      difficulty: 5,
    };
  }
  return {
    kind: "placeholder",
    label: "College / amateur",
    reason: "No college or amateur record on Wikipedia.",
    difficulty: 5,
  };
}

function buildSwingSilhouetteClue(input: CluePoolInput): Clue {
  return {
    kind: "swing-silhouette",
    assetUrl: getSwingSilhouetteUrl(input.golfer.wikiTitle),
    difficulty: 5,
  };
}

function buildFlagClue(input: CluePoolInput): Clue | null {
  const flag = resolveFlag(input.meta.nationality);
  if (!flag) return null;
  return {
    kind: "flag",
    country: flag.country,
    emoji: flag.emoji,
    difficulty: 3,
  };
}

function buildPeakRankingClue(input: CluePoolInput): Clue | null {
  if (!input.meta.topRanking) return null;
  return {
    kind: "stat",
    label: "Peak world ranking",
    value: input.meta.topRanking,
    secondary: input.meta.topRankingYear
      ? `reached ${input.meta.topRankingYear}`
      : undefined,
    accent: "amber",
    difficulty: 2,
  };
}

function buildTotalWinsClue(input: CluePoolInput): Clue | null {
  if (!input.meta.proWinsTotal) return null;
  return {
    kind: "stat",
    label: "Total professional wins",
    value: input.meta.proWinsTotal,
    accent: "emerald",
    difficulty: 3,
  };
}

function buildTeamAppearancesClue(input: CluePoolInput): Clue | null {
  const { ryderCup, presidentsCup } = input;
  if (!ryderCup && !presidentsCup) return null;
  const parts: string[] = [];
  if (ryderCup) parts.push(`Ryder Cup × ${ryderCup}`);
  if (presidentsCup) parts.push(`Presidents Cup × ${presidentsCup}`);
  return {
    kind: "stat",
    label: "Team-match appearances",
    value: parts.join(" · "),
    accent: "rose",
    difficulty: 3,
  };
}

function buildPgaWinsChartClue(input: CluePoolInput): Clue | null {
  if (input.heroIsPgaWins) return null; // avoid duplicating the hero
  if (!input.pgaWinsByYear.length) return null;
  return {
    kind: "wins-chart",
    label: "Career PGA Tour wins",
    data: input.pgaWinsByYear,
    difficulty: 2,
  };
}

function buildFedExCupClue(input: CluePoolInput): Clue | null {
  const years = FEDEX_CUP_WINS[input.golfer.wikiTitle];
  if (!years || !years.length) return null;
  return {
    kind: "stat",
    label: "FedEx Cup",
    value: `Champion ${years.join(", ")}`,
    secondary: years.length > 1 ? `${years.length}× winner` : undefined,
    accent: "amber",
    difficulty: 2,
  };
}

function buildPoyClue(input: CluePoolInput): Clue | null {
  const years = PLAYER_OF_THE_YEAR[input.golfer.wikiTitle];
  if (!years || !years.length) return null;
  return {
    kind: "stat",
    label: "PGA Tour Player of the Year",
    value: `Jack Nicklaus Award ${years.join(", ")}`,
    secondary: years.length > 1 ? `${years.length}× POY` : undefined,
    accent: "amber",
    difficulty: 2,
  };
}

function buildDrivingDistanceClue(input: CluePoolInput): Clue | null {
  const years = DRIVING_DISTANCE_LEADERS[input.golfer.wikiTitle];
  if (!years || !years.length) return null;
  return {
    kind: "stat",
    label: "Driving distance",
    value: `Led the PGA Tour ${years.join(", ")}`,
    accent: "sky",
    difficulty: 3,
  };
}

function buildSgLeaderClue(input: CluePoolInput): Clue | null {
  const entries = SG_LEADERS[input.golfer.wikiTitle];
  if (!entries || !entries.length) return null;
  const summary = entries
    .map((e) => `${e.category} (${e.year})`)
    .join(" · ");
  return {
    kind: "stat",
    label: "Strokes-gained leader",
    value: summary,
    accent: "emerald",
    difficulty: 2,
  };
}

function buildSignatureMomentClue(
  input: CluePoolInput,
  seed: number
): Clue | null {
  const moments = SIGNATURE_MOMENTS[input.golfer.wikiTitle];
  if (!moments || !moments.length) return null;
  const pick = moments[seed % moments.length];
  return {
    kind: "text",
    label: "Career moment",
    value: pick,
    difficulty: 3,
  };
}

function buildWinsByTourClue(input: CluePoolInput): Clue | null {
  if (!input.meta.tourWins) return null;
  return {
    kind: "tour-wins",
    html: input.meta.tourWins,
    difficulty: 4,
  };
}

function buildLastMajorVenueClue(input: CluePoolInput): Clue | null {
  const win = input.lastMajorWin;
  if (!win) return null;
  return {
    kind: "major-venue",
    tournament: win.tournament,
    course: win.course,
    location: win.location,
    year: win.year,
    witty: win.onlyMasters,
    difficulty: 2,
  };
}

function buildLifelineClue(input: CluePoolInput): Clue | null {
  if (!input.golfer.lifeline) return null;
  return {
    kind: "lifeline",
    value: input.golfer.lifeline,
    difficulty: 1, // always last
  };
}

// ---------- Fixed-order picker ----------

/**
 * The daily puzzle uses a fixed clue order. Same 5 clue types every day,
 * unlocked one per wrong guess:
 *   1. Peak world ranking
 *   2. Wins by tour
 *   3. Nation flag / nationality
 *   4. Last major venue
 *   5. Lifeline
 */
export function pickFixedOrderClues(input: CluePoolInput): Clue[] {
  const peakRanking: Clue =
    buildPeakRankingClue(input) ?? {
      kind: "placeholder",
      label: "Peak world ranking",
      reason: "No Highest Ranking row on Wikipedia.",
      difficulty: 4,
    };

  const winsByTour: Clue =
    buildWinsByTourClue(input) ?? {
      kind: "placeholder",
      label: "Wins by tour",
      reason: "No wins-by-tour breakdown on Wikipedia.",
      difficulty: 3,
    };

  const flag: Clue =
    buildFlagClue(input) ?? {
      kind: "placeholder",
      label: "Nation flag",
      reason: "Couldn't determine nationality from Wikipedia.",
      difficulty: 3,
    };

  const majorVenue: Clue =
    buildLastMajorVenueClue(input) ?? {
      kind: "placeholder",
      label: "Last major venue",
      reason: "No major wins found in Wikipedia wins table.",
      difficulty: 2,
    };

  const lifeline: Clue =
    buildLifelineClue(input) ?? {
      kind: "placeholder",
      label: "Lifeline",
      reason: "No lifeline on file for this golfer.",
      difficulty: 1,
    };

  return [peakRanking, winsByTour, flag, majorVenue, lifeline];
}

// Re-exported so the strip's builders are visible to tests / other
// callers even though the picker doesn't use them directly.
export const _UNUSED_GRAB_BAG_BUILDERS = {
  buildBuildStat,
  buildCareerTimingClue,
  buildCollegeClue,
  buildTotalWinsClue,
  buildTeamAppearancesClue,
  buildPgaWinsChartClue,
  buildFedExCupClue,
  buildPoyClue,
  buildDrivingDistanceClue,
  buildSgLeaderClue,
  buildSignatureMomentClue,
};
