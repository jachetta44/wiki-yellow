import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Share2,
  Info,
  Search,
  Lock,
  Eye,
  Trophy,
  RotateCw,
  FlaskConical,
  Dice5,
  ListOrdered,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GOLFERS } from "@/data/golfers";
import { MODERN_DAILY_POOL } from "@/data/dailyPool";
import {
  fetchWikiMarkup,
  findMajorTables,
  cleanTablesHtml,
  findEventTable,
  findPgaTourWinsTable,
  cleanSingleTableHtml,
  extractInfoboxData,
  extractPgaWinsByYear,
  extractTeamAppearances,
  extractNickname,
  extractLastMajorWin,
  LastMajorWin,
  SIGNATURE_EVENTS,
  SignatureEvent,
} from "@/lib/wiki";
import { normalizeName } from "@/lib/helpers";
import { Golfer, MetaInfo } from "@/components/types";
import { Clue } from "@/components/clues/types";
import { ClueCard } from "@/components/clues/ClueCard";
import { pickFixedOrderClues } from "@/components/clues/builders";

const MAX_GUESSES = 6;

// ---------- Seed + persistence ----------
function seedFromDate(dateStr: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function seedFromString(s: string): number {
  return seedFromDate(s);
}
function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function pickDailyGolfer(dateStr: string): Golfer {
  // Curated "modern primes 2012-2026" pool — fall back to the full list only
  // if the curated pool is empty (shouldn't happen in practice).
  const pool = MODERN_DAILY_POOL.length ? MODERN_DAILY_POOL : GOLFERS;
  return pool[seedFromDate(dateStr) % pool.length];
}

// A "visual" is the hero graphic for today's puzzle. It's either a per-year
// record at a specific PGA Tour signature event, or the player's full PGA
// Tour wins list. Rotating this keeps the daily puzzle from feeling like
// classic mode with a guess limit.
export type DailyVisual =
  | { kind: "event"; event: SignatureEvent; label: string; shortLabel: string }
  | { kind: "pga-wins"; label: string; shortLabel: string };

const EVENT_VISUALS: DailyVisual[] = SIGNATURE_EVENTS.map((event) => ({
  kind: "event" as const,
  event,
  label: event.label,
  shortLabel: event.shortLabel,
}));

export const DAILY_VISUALS: DailyVisual[] = [
  ...EVENT_VISUALS,
  { kind: "pga-wins", label: "PGA Tour wins", shortLabel: "PGA Tour wins" },
  // PGA wins appears twice so it comes up more often than any single
  // signature event — virtually every modern golfer has one, whereas
  // signature-event tables are sometimes missing on individual pages.
  { kind: "pga-wins", label: "PGA Tour wins", shortLabel: "PGA Tour wins" },
];

function pickDailyVisual(dateStr: string): DailyVisual {
  return DAILY_VISUALS[
    seedFromString(`visual::${dateStr}`) % DAILY_VISUALS.length
  ];
}

type Status = "playing" | "won" | "lost";
type DailyState = { guesses: string[]; status: Status };

function loadState(key: string): DailyState | null {
  try {
    const raw = localStorage.getItem(`wikiYellow.daily.${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.guesses)) return null;
    return parsed as DailyState;
  } catch {
    return null;
  }
}
function saveState(key: string, state: DailyState) {
  try {
    localStorage.setItem(`wikiYellow.daily.${key}`, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

function isCorrectGuess(guess: string, g: Golfer): boolean {
  const n = normalizeName(guess);
  const valid = [g.displayName, g.wikiTitle, ...(g.acceptedAnswers || [])]
    .map(normalizeName)
    .filter(Boolean);
  return valid.includes(n);
}

const EMPTY_META: MetaInfo = {
  height: null,
  weight: null,
  heightWeight: null,
  tourWins: null,
  nationality: null,
  topRanking: null,
  topRankingYear: null,
  imageUrl: null,
  infoboxFound: false,
  bornYear: null,
  turnedPro: null,
  college: null,
  proWinsTotal: null,
  amateurWins: null,
};

// ---------- Clue-strip helpers ----------
type WikiExtras = {
  ryderCup: number | null;
  presidentsCup: number | null;
  nickname: string | null;
  pgaWinsByYear: { year: number; count: number }[];
  lastMajorWin: LastMajorWin | null;
};

const EMPTY_EXTRAS: WikiExtras = {
  ryderCup: null,
  presidentsCup: null,
  nickname: null,
  pgaWinsByYear: [],
  lastMajorWin: null,
};

function clueLabel(clue: Clue): string {
  switch (clue.kind) {
    case "flag":
      return "Country";
    case "text":
    case "stat":
      return clue.label;
    case "wins-chart":
      return "Career PGA Tour wins";
    case "tour-wins":
      return "Wins by tour";
    case "major-venue":
      return "Last major venue";
    case "swing-silhouette":
      return "Swing silhouette";
    case "placeholder":
      return clue.label;
    case "lifeline":
      return "Lifeline";
  }
}

function clueBlurb(clue: Clue): string {
  switch (clue.kind) {
    case "flag":
      return "The country this golfer represents.";
    case "stat":
      return "A stat card with a single fact from their career.";
    case "text":
      return "A short career detail pulled from their profile.";
    case "wins-chart":
      return "A year-by-year chart of their PGA Tour wins.";
    case "tour-wins":
      return "A breakdown of their professional wins across all tours.";
    case "major-venue":
      return "The course where they won their most recent major championship.";
    case "swing-silhouette":
      return "A short down-the-line clip of their swing, shown as a silhouette.";
    case "placeholder":
      return clue.reason;
    case "lifeline":
      return "A last-resort personal tell — almost gives it away.";
  }
}

// ---------- Component ----------
export function DailyPuzzle() {
  const todayKey = useMemo(getTodayKey, []);
  const baseGolfer = useMemo(() => pickDailyGolfer(todayKey), [todayKey]);
  const baseVisual = useMemo(() => pickDailyVisual(todayKey), [todayKey]);

  // Debug overrides — let the developer reroll/cycle without waiting for the
  // date to change. Null means "use the seeded daily pick."
  const [golferOverride, setGolferOverride] = useState<Golfer | null>(null);
  const [visualOverride, setVisualOverride] = useState<DailyVisual | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  const golfer = golferOverride || baseGolfer;
  const visual = visualOverride || baseVisual;

  const saved = useMemo(() => loadState(todayKey), [todayKey]);

  const [guesses, setGuesses] = useState<string[]>(saved?.guesses || []);
  const [status, setStatus] = useState<Status>(saved?.status || "playing");
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error" | "ok">("info");

  // Scraped Wikipedia data
  const [loading, setLoading] = useState(true);
  const [eventTableHtml, setEventTableHtml] = useState("");
  const [pgaWinsHtml, setPgaWinsHtml] = useState("");
  const [heroMissing, setHeroMissing] = useState(false);
  const [majorTableHtml, setMajorTableHtml] = useState("");
  const [meta, setMeta] = useState<MetaInfo>(EMPTY_META);
  const [extras, setExtras] = useState<WikiExtras>(EMPTY_EXTRAS);

  const gameOver = status !== "playing";

  // Today's clue strip — fixed 5-slot order, same structure every day:
  //   1) College / amateur  2) Swing silhouette  3) Nation flag
  //   4) Peak world ranking  5) Lifeline
  // Each wrong guess unlocks the next slot.
  const todaysClues = useMemo<Clue[]>(
    () =>
      pickFixedOrderClues({
        golfer,
        meta,
        ryderCup: extras.ryderCup,
        presidentsCup: extras.presidentsCup,
        nickname: extras.nickname,
        pgaWinsByYear: extras.pgaWinsByYear,
        lastMajorWin: extras.lastMajorWin,
        heroIsPgaWins: visual.kind === "pga-wins",
      }),
    [golfer, meta, extras, visual.kind]
  );

  const cluesUnlocked = gameOver
    ? todaysClues.length
    : Math.min(guesses.length, todaysClues.length);

  const normalizedInput = normalizeName(input);
  const suggestions = useMemo(() => {
    if (!normalizedInput) return [];
    // Suggest from the full roster — players guess from memory, they
    // shouldn't need to know our modern-pool filter.
    return GOLFERS.filter((g) => {
      const names = [g.displayName, g.wikiTitle, ...(g.acceptedAnswers || [])];
      return names.some((n) => normalizeName(n).includes(normalizedInput));
    })
      .slice(0, 5)
      .map((g) => g.displayName);
  }, [normalizedInput]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setEventTableHtml("");
      setPgaWinsHtml("");
      setHeroMissing(false);
      setMajorTableHtml("");
      setMeta(EMPTY_META);
      setExtras(EMPTY_EXTRAS);
      try {
        const html = await fetchWikiMarkup(golfer.wikiTitle);
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(html, "text/html");

        if (visual.kind === "event") {
          const eventTable = findEventTable(doc, visual.event);
          if (eventTable) setEventTableHtml(cleanSingleTableHtml(eventTable));
          else setHeroMissing(true);
        } else {
          // pga-wins
          const pgaTable = findPgaTourWinsTable(doc);
          if (pgaTable) setPgaWinsHtml(cleanSingleTableHtml(pgaTable));
          else setHeroMissing(true);
        }

        const majorTables = findMajorTables(doc);
        if (majorTables.length) setMajorTableHtml(cleanTablesHtml(majorTables));

        setMeta(extractInfoboxData(doc));

        // Supplementary scrapes feeding the clue pool.
        const teamApps = extractTeamAppearances(doc);
        setExtras({
          ryderCup: teamApps.ryderCup,
          presidentsCup: teamApps.presidentsCup,
          nickname: extractNickname(doc),
          pgaWinsByYear: extractPgaWinsByYear(doc),
          lastMajorWin: extractLastMajorWin(doc),
        });
      } catch {
        /* leave blanks; the lifeline clue still has the golfer's blurb */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [golfer, visual]);

  function submit() {
    if (gameOver || !input.trim()) return;
    const text = input.trim();
    const correct = isCorrectGuess(text, golfer);
    const newGuesses = [...guesses, text];
    const newStatus: Status = correct
      ? "won"
      : newGuesses.length >= MAX_GUESSES
      ? "lost"
      : "playing";

    setGuesses(newGuesses);
    setStatus(newStatus);
    setInput("");
    saveState(todayKey, { guesses: newGuesses, status: newStatus });

    if (correct) {
      setMessage(
        `Correct — ${golfer.displayName}! Solved in ${newGuesses.length}/${MAX_GUESSES}.`
      );
      setMessageTone("ok");
    } else if (newStatus === "lost") {
      setMessage(`Out of guesses. Today's golfer was ${golfer.displayName}.`);
      setMessageTone("error");
    } else {
      const unlocked = Math.min(newGuesses.length, todaysClues.length);
      const clue = todaysClues[unlocked - 1];
      const label = clue ? clueLabel(clue) : "clue";
      setMessage(
        `Not quite — “${label}” unlocked. ${MAX_GUESSES - newGuesses.length} guess${
          MAX_GUESSES - newGuesses.length === 1 ? "" : "es"
        } left.`
      );
      setMessageTone("error");
    }
  }

  // ---------- Debug helpers ----------
  function clearProgress() {
    setGuesses([]);
    setStatus("playing");
    setInput("");
    setMessage("");
    setMessageTone("info");
    try {
      localStorage.removeItem(`wikiYellow.daily.${todayKey}`);
    } catch {
      /* ignore */
    }
  }
  function resetDaily() {
    // Full reset — drop overrides too, so we return to the seeded daily pick.
    setGolferOverride(null);
    setVisualOverride(null);
    clearProgress();
    setMessage("Debug: daily reset.");
    setMessageTone("info");
  }
  function visualKey(v: DailyVisual): string {
    return v.kind === "event" ? `event:${v.event.id}` : "pga-wins";
  }
  function cycleVisual() {
    // Walk through each *distinct* visual once (skip the duplicate pga-wins entry).
    const uniqueVisuals = [...EVENT_VISUALS, DAILY_VISUALS.find((v) => v.kind === "pga-wins")!];
    const currentIdx = uniqueVisuals.findIndex((v) => visualKey(v) === visualKey(visual));
    const nextIdx = (currentIdx + 1) % uniqueVisuals.length;
    setVisualOverride(uniqueVisuals[nextIdx]);
    clearProgress();
    setMessage(`Debug: visual → ${uniqueVisuals[nextIdx].label}.`);
    setMessageTone("info");
  }
  function rerollGolfer() {
    // Reroll stays inside the modern pool so the daily always feels on-brand.
    const pool = MODERN_DAILY_POOL.length ? MODERN_DAILY_POOL : GOLFERS;
    let pick = golfer;
    let safety = 0;
    while (pick.wikiTitle === golfer.wikiTitle && safety < 20) {
      pick = pool[Math.floor(Math.random() * pool.length)];
      safety += 1;
    }
    setGolferOverride(pick);
    clearProgress();
    // setMessage(`Debug: rerolled golfer → ${pick.displayName}.`);
    setMessageTone("info");
  }
  function revealAnswer() {
    setStatus("lost");
    // setMessage(`Debug: answer is ${golfer.displayName}.`);
    setMessageTone("info");
  }

  function shareResult() {
    const score =
      status === "won" ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
    const grid = guesses
      .map((_, i) =>
        i === guesses.length - 1 && status === "won" ? "🟩" : "🟥"
      )
      .join("");
    const padding = "⬛".repeat(Math.max(0, MAX_GUESSES - guesses.length));
    const text = `WikiYellow Daily · ${todayKey} · ${visual.shortLabel}\n${score}\n${grid}${padding}`;
    navigator.clipboard?.writeText(text).then(
      () => {
        setMessage("Result copied to clipboard.");
        setMessageTone("ok");
      },
      () => {
        setMessage(text);
        setMessageTone("info");
      }
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl"
    >
      {/* Top strip — daily header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-amber-700" />
          <div>
            <div className="font-serif text-2xl tracking-tight">Daily puzzle</div>
            <div className="text-[11px] text-slate-600">
              Today's tournament dossier — {MAX_GUESSES} guesses
            </div>
          </div>
          <Badge className="ml-2 rounded-full bg-amber-300 text-slate-900 hover:bg-amber-300">
            {todayKey}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full border-slate-300 bg-white/70 text-[10px]"
          >
            {visual.kind === "event" ? (
              <Trophy className="mr-1 h-3 w-3" />
            ) : (
              <ListOrdered className="mr-1 h-3 w-3" />
            )}
            {visual.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-xl border-dashed border-slate-300 bg-white/70 text-[11px] text-slate-600 hover:bg-slate-50"
            onClick={() => setDebugOpen((v) => !v)}
            title="Developer controls"
          >
            <FlaskConical className="mr-1 h-3.5 w-3.5" />
            Debug
          </Button>
          {gameOver && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={shareResult}
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Share
            </Button>
          )}
        </div>
      </div>

      {debugOpen && (
        <div className="mb-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Debug controls
            </div>
            <div className="text-[10px] text-slate-500">
              {golferOverride ? "golfer: override · " : "golfer: seeded · "}
              {visualOverride ? "visual: override" : "visual: seeded"}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl bg-white text-[11px]"
              onClick={resetDaily}
              title="Clear localStorage + state for today"
            >
              <RotateCw className="mr-1 h-3.5 w-3.5" />
              Reset today
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl bg-white text-[11px]"
              onClick={cycleVisual}
              title={`Next visual (currently ${visual.shortLabel})`}
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Cycle visual
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl bg-white text-[11px]"
              onClick={rerollGolfer}
              title="Pick a random golfer"
            >
              <Dice5 className="mr-1 h-3.5 w-3.5" />
              Reroll golfer
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl bg-white text-[11px]"
              onClick={revealAnswer}
              title="End the game now — unlocks all stats + major grid"
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              Reveal answer
            </Button>
            <div className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Answer:</span>
              <span className="rounded bg-slate-900/5 px-2 py-0.5 font-mono text-[10px]">
                {golfer.displayName}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hero grid: dossier + unlocking clue strip */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Left — today's hero visual */}
        <Card className="rounded-3xl border-slate-200 bg-[#fffdf7] shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="font-serif text-xl tracking-tight">
                {visual.kind === "event" ? visual.event.label : "PGA Tour wins"}
              </CardTitle>
              <Badge
                variant="outline"
                className="rounded-full border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
              >
                live from Wikipedia
              </Badge>
            </div>
            <CardDescription className="text-slate-600">
              {visual.kind === "event"
                ? `Today's golfer has this record at ${visual.event.shortLabel}. Use the grid — and the clues that unlock on each wrong guess — to identify them.`
                : "Today's golfer has won these PGA Tour events. Combine the tournament-by-tournament list with the clues that unlock on each wrong guess."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                Loading {visual.shortLabel}…
              </div>
            ) : visual.kind === "event" && eventTableHtml ? (
              <div className="overflow-auto rounded-2xl border border-slate-200 bg-[#f8f9fa] p-3">
                <div
                  className="wiki-capture"
                  dangerouslySetInnerHTML={{ __html: eventTableHtml }}
                />
              </div>
            ) : visual.kind === "pga-wins" && pgaWinsHtml ? (
              <div className="overflow-auto rounded-2xl border border-slate-200 bg-[#f8f9fa]">
                <div
                  className="pga-wins"
                  dangerouslySetInnerHTML={{ __html: pgaWinsHtml }}
                />
              </div>
            ) : (
              <Alert className="rounded-2xl border-amber-200 bg-amber-50">
                <Info className="h-4 w-4" />
                <AlertTitle>
                  No {visual.shortLabel} table available
                </AlertTitle>
                <AlertDescription>
                  {visual.kind === "event"
                    ? `This golfer's Wikipedia page doesn't have a dedicated ${visual.shortLabel} record table.`
                    : "This golfer's Wikipedia page doesn't list PGA Tour wins in the usual format."}{" "}
                  Lean on the clue strip — each wrong guess still unlocks a
                  new clue.
                </AlertDescription>
              </Alert>
            )}

            {/* Guess dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: MAX_GUESSES }, (_, i) => {
                const used = i < guesses.length;
                const isWin = status === "won" && i === guesses.length - 1;
                return (
                  <div
                    key={i}
                    className={[
                      "h-2.5 flex-1 rounded-full",
                      isWin
                        ? "bg-emerald-500"
                        : used
                        ? "bg-red-400"
                        : "bg-slate-200",
                    ].join(" ")}
                  />
                );
              })}
              <span className="ml-2 text-xs font-medium text-slate-600">
                {guesses.length}/{MAX_GUESSES}
              </span>
            </div>

            {/* Input or end state */}
            {!gameOver ? (
              <div>
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submit();
                    }}
                    placeholder="Guess today's golfer"
                    className="h-10 flex-1 rounded-xl border-slate-300 bg-white"
                    autoComplete="off"
                  />
                  <Button
                    onClick={submit}
                    disabled={!input.trim()}
                    className="h-10 rounded-xl bg-slate-900 px-4 text-white hover:bg-slate-800"
                  >
                    <Search className="mr-1.5 h-4 w-4" />
                    Guess
                  </Button>
                </div>
                {input.trim() && suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {suggestions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setInput(name)}
                        className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-50"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Alert
                className={
                  status === "won"
                    ? "rounded-2xl border-emerald-200 bg-emerald-50"
                    : "rounded-2xl border-red-200 bg-red-50"
                }
              >
                <Info className="h-4 w-4" />
                <AlertTitle>
                  {status === "won" ? "Solved" : "Out of guesses"}
                </AlertTitle>
                <AlertDescription>
                  {status === "won"
                    ? `You got ${golfer.displayName} in ${guesses.length}/${MAX_GUESSES}. Come back tomorrow for a new puzzle.`
                    : `Today's golfer was ${golfer.displayName}. Come back tomorrow for a new puzzle.`}
                </AlertDescription>
              </Alert>
            )}

            {message && (
              <div
                className={[
                  "rounded-2xl border px-3 py-2 text-sm",
                  messageTone === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : messageTone === "error"
                    ? "border-red-200 bg-red-50 text-red-900"
                    : "border-slate-200 bg-white text-slate-800",
                ].join(" ")}
              >
                {message}
              </div>
            )}

            {/* Guesses so far */}
            {guesses.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-2">
                <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Guesses so far
                </div>
                <div className="flex flex-col gap-1">
                  {guesses.map((g, i) => {
                    const correct = i === guesses.length - 1 && status === "won";
                    return (
                      <div
                        key={i}
                        className={[
                          "flex items-center justify-between rounded-xl px-2.5 py-1.5 text-sm",
                          correct
                            ? "bg-emerald-50 text-emerald-900"
                            : "bg-red-50 text-red-900",
                        ].join(" ")}
                      >
                        <span>{g}</span>
                        <span className="font-semibold">
                          {correct ? "✓" : "✗"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {heroMissing && (
              <p className="text-[11px] italic text-slate-500">
                Tip: when the hero visual is missing, the clue strip becomes
                the whole game.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Right — clue strip */}
        <Card className="rounded-3xl border-slate-200 bg-white shadow-sm lg:sticky lg:top-[88px]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-xl">
                Clues revealed
              </CardTitle>
              <span className="text-[11px] font-medium text-slate-500">
                {cluesUnlocked} / {todaysClues.length || 5} unlocked
              </span>
            </div>
            <Progress
              value={
                todaysClues.length
                  ? (cluesUnlocked / todaysClues.length) * 100
                  : 0
              }
              className="mt-2 h-1.5"
            />
            <CardDescription className="mt-1 text-[11px] text-slate-600">
              One clue unlocks per wrong guess. Variety rotates day to day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !todaysClues.length ? (
              <div className="flex min-h-[120px] items-center justify-center text-sm text-slate-500">
                Preparing clues…
              </div>
            ) : todaysClues.length === 0 ? (
              <div className="text-sm text-slate-500">
                Couldn't build any clues for this golfer.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {todaysClues.map((clue, i) => {
                  const revealed = cluesUnlocked > i;
                  const isNext = !revealed && i === cluesUnlocked;
                  const isLifeline = clue.kind === "lifeline";
                  const label = clueLabel(clue);
                  const blurb = clueBlurb(clue);
                  return (
                    <li
                      key={`${clue.kind}-${i}`}
                      className={[
                        "py-2.5",
                        isNext ? "-mx-2 rounded-xl bg-amber-50/60 px-2" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {label}
                            </span>
                            {isLifeline && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                                lifeline
                              </span>
                            )}
                            {isNext && (
                              <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                                next
                              </span>
                            )}
                          </div>
                          {revealed ? (
                            <div className="mt-1.5">
                              <ClueCard clue={clue} />
                            </div>
                          ) : (
                            <div className="mt-0.5 text-xs text-slate-500">
                              {blurb}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 pt-1">
                          {revealed ? (
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
                              aria-label="revealed"
                              title="Revealed"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </div>
                          ) : (
                            <div
                              className={[
                                "flex h-7 w-7 items-center justify-center rounded-full",
                                isNext
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-500",
                              ].join(" ")}
                              aria-label="locked"
                              title="Locked"
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Major grid — bonus reveal after game ends */}
      <Card className="mt-4 rounded-3xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-serif text-xl">Major grid</CardTitle>
          <CardDescription className="text-slate-600">
            {gameOver
              ? "Bonus: here's the full major-championship grid for today's golfer."
              : "Hidden until the puzzle is done."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!gameOver ? (
            <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              🔒 revealed on completion
            </div>
          ) : loading ? (
            <div className="flex min-h-[160px] items-center justify-center text-slate-500">
              Loading Wikipedia board…
            </div>
          ) : majorTableHtml ? (
            <div className="overflow-auto rounded-2xl border border-slate-200 bg-[#f8f9fa] p-3">
              <div
                className="wiki-capture"
                dangerouslySetInnerHTML={{
                  __html: `<h2>Results timeline</h2><em>Major championship results</em>${majorTableHtml}`,
                }}
              />
            </div>
          ) : (
            <div className="text-sm text-slate-500">
              Couldn't load this golfer's major grid.
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
