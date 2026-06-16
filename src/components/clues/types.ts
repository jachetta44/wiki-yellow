// Clue is a tagged union. Each kind has its own visual in ClueCard.tsx.
// difficulty (1-5) controls reveal order: hardest first, easiest last.

export type Clue =
  | {
      kind: "flag";
      country: string;
      emoji?: string; // optional flag emoji
      difficulty: number;
    }
  | {
      kind: "text";
      label: string;
      value: string;
      difficulty: number;
    }
  | {
      kind: "stat";
      label: string;
      value: string;
      secondary?: string;
      accent?: "default" | "amber" | "emerald" | "sky" | "rose";
      difficulty: number;
    }
  | {
      kind: "wins-chart";
      label: string;
      data: { year: number; count: number }[];
      difficulty: number;
    }
  | {
      kind: "swing-silhouette";
      // Path to the looped silhouette clip (webm/webp/gif) under /public.
      // When null, we render a "coming soon" placeholder so the slot still
      // reads as a recognizable clue type.
      assetUrl: string | null;
      difficulty: number;
    }
  | {
      kind: "placeholder";
      // Fallback slot used by the fixed-order picker when the preferred
      // builder returned null (e.g. no college on record). The slot still
      // renders in the strip so the ordering stays predictable.
      label: string;
      reason: string;
      difficulty: number;
    }
  | {
      kind: "tour-wins";
      html: string;
      difficulty: number;
    }
  | {
      kind: "major-venue";
      tournament: string;
      course: string;
      location: string;
      year: number;
      witty: boolean; // true when every major win is Augusta (Masters-only)
      difficulty: number;
    }
  | {
      kind: "lifeline";
      value: string;
      difficulty: number;
    };

export type ClueKind = Clue["kind"];
