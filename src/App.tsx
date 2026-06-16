import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import { Badge } from "@/components/ui/badge";
import { WIKI_CSS } from "@/lib/constants";
import { runSelfTests, normalizeName, shuffleArray } from "@/lib/helpers";
import { fetchWikiMarkup, findMajorTables, cleanTablesHtml, extractInfoboxData } from "@/lib/wiki";
import { GOLFERS } from "@/data/golfers";
import { MAJOR_RESULTS } from "@/data/majorResults";
import { BoardPanel } from "@/components/BoardPanel";
import { GuessPanel } from "@/components/GuessPanel";
import { HintPanel } from "@/components/HintPanel";
import { Scoreboard } from "@/components/Scoreboard";
import { ScorecardModal } from "@/components/ScorecardModal";
import { Golfer, MetaInfo } from "@/components/types";

const SELF_TESTS_PASSED = runSelfTests();

// ---------- Par system ----------
export const PAR = 3;

export type RoundResult = {
  label: string;  // "Birdie", "Par", etc.
  scoreVsPar: number; // negative = under par
  snowman: boolean;
};

export function computeRoundResult(strokes: number, gaveUp: boolean): RoundResult {
  if (gaveUp) return { label: "Triple Bogey", scoreVsPar: 3, snowman: true };
  const scoreVsPar = strokes - PAR;
  const label = parLabel(scoreVsPar);
  return { label, scoreVsPar, snowman: false };
}

export type HoleRecord = {
  golferName: string;
  imageUrl: string | null;
  result: RoundResult;
  strokes: number;
};

export const HOLES_PER_ROUND = 9;

export function holeEmoji(result: RoundResult): string {
  if (result.snowman) return "🟥";
  switch (result.scoreVsPar) {
    case -3: return "🦤";
    case -2: return "🦅";
    case -1: return "🐦";
    case  0: return "⬜";
    case  1: return "🟠";
    case  2: return "🔴";
    default: return result.scoreVsPar < 0 ? "🦤" : "🔴";
  }
}

export function parLabel(scoreVsPar: number): string {
  switch (scoreVsPar) {
    case -3: return "Albatross";
    case -2: return "Hole in One";
    case -1: return "Birdie";
    case  0: return "Par";
    case  1: return "Bogey";
    case  2: return "Double Bogey";
    case  3: return "Triple Bogey";
    default: return scoreVsPar < 0 ? `${scoreVsPar}` : `+${scoreVsPar}`;
  }
}

// ---------- Helpers ----------
function isCorrectGuess(guess: string, golfer: Golfer): boolean {
  const normalizedGuess = normalizeName(guess);
  const validAnswers = [golfer.displayName, golfer.wikiTitle, ...(golfer.acceptedAnswers || [])]
    .map(normalizeName)
    .filter(Boolean);
  return validAnswers.includes(normalizedGuess);
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

const SEEN_KEY = "wiki-yellow-seen-v1";

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

function saveSeen(seen: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch {}
}

function buildBag(seen: Set<string>): Golfer[] {
  const available = GOLFERS.filter((g) => !seen.has(g.wikiTitle));
  return shuffleArray(available.length > 0 ? available : GOLFERS);
}

export default function App() {
  const [seen, setSeen] = useState<Set<string>>(loadSeen);
  const [shuffleBag, setShuffleBag] = useState<Golfer[]>(() => buildBag(loadSeen()));
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = shuffleBag[currentIndex];

  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "ok" | "error">("info");
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [wrongGuessesThisRound, setWrongGuessesThisRound] = useState(0);
  // Only manual hint reveals cost a stroke (wrong guesses auto-reveal for free)
  const [manualHintsRevealed, setManualHintsRevealed] = useState(0);

  // Running session stats
  const [totalVsPar, setTotalVsPar] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);

  // 9-hole round tracking
  const [holeHistory, setHoleHistory] = useState<HoleRecord[]>([]);
  const [showScorecard, setShowScorecard] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pngDataUrl, setPngDataUrl] = useState("");
  const [tableHtml, setTableHtml] = useState("");
  const [meta, setMeta] = useState<MetaInfo>(EMPTY_META);
  const captureRef = useRef<HTMLDivElement | null>(null);

  const { hints, majorHintLabel } = useMemo(() => {
    const majorData = MAJOR_RESULTS[current.wikiTitle] ?? { type: 'none' as const };
    let majorHintText: string;
    let majorHintLabel: string;

    if (majorData.type === 'win') {
      majorHintLabel = "Last major win venue";
      majorHintText = [
        majorData.course,
        majorData.location,
        majorData.onlyMasters
          ? "Tough luck — it's always Augusta!"
          : `${majorData.tournament} · ${majorData.year}`,
      ]
        .filter(Boolean)
        .join("\n");
    } else if (majorData.type === 'best') {
      majorHintLabel = "Best major result";
      majorHintText = [
        majorData.course,
        majorData.location,
        `Best result: ${majorData.position} · ${majorData.tournament} ${majorData.year}`,
      ].filter(Boolean).join("\n");
    } else {
      majorHintLabel = "Best major result";
      majorHintText = "No major results found.";
    }

    return {
      hints: [
        meta.nationality || "Nationality unavailable.",
        majorHintText,
        current.lifeline,
        // meta.tourWins kept available for future re-addition
      ],
      majorHintLabel,
    };
  }, [meta, current]);

  // Wrong guesses auto-reveal the next hint at no extra cost; only manual reveals add strokes
  const strokesThisRound = wrongGuessesThisRound + manualHintsRevealed;

  const normalizedGuess = normalizeName(guess);
  const suggestions = useMemo(() => {
    if (!normalizedGuess) return [];
    return GOLFERS.filter((golfer) => {
      const names = [golfer.displayName, golfer.wikiTitle, ...(golfer.acceptedAnswers || [])];
      return names.some((name) => normalizeName(name).includes(normalizedGuess));
    })
      .slice(0, 6)
      .map((golfer) => golfer.displayName);
  }, [normalizedGuess]);

  useEffect(() => {
    let cancelled = false;
    async function loadPlayer() {
      setLoading(true);
      setError("");
      setPngDataUrl("");
      setTableHtml("");
      setMeta(EMPTY_META);
      setHintLevel(0);
      setWrongGuessesThisRound(0);
      setManualHintsRevealed(0);
      setAnswerRevealed(false);
      setMessage("");
      setMessageTone("info");

      try {
        const html = await fetchWikiMarkup(current.wikiTitle);
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(html, "text/html");
        const tables = findMajorTables(doc);
        if (!tables.length) {
          // This golfer's Wikipedia page has no major results grid — skip silently,
          // no score penalty, mark seen so we don't retry them this session.
          if (!cancelled) {
            console.warn(`No major table for ${current.wikiTitle} — auto-skipping`);
            markSeen(current.wikiTitle);
            nextPlayer();
          }
          return;
        }
        const info = extractInfoboxData(doc);
        setTableHtml(cleanTablesHtml(tables));
        setMeta(info);
      } catch (err) {
        const text = err instanceof Error ? err.message : "Failed to load this golfer.";
        if (!cancelled) setError(text);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPlayer();
    return () => { cancelled = true; };
  }, [current]);

  useEffect(() => {
    async function makePng() {
      if (!captureRef.current || !tableHtml || loading) return;
      try {
        const dataUrl = await toPng(captureRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#f8f9fa",
        });
        setPngDataUrl(dataUrl);
      } catch {
        setPngDataUrl("");
      }
    }
    const id = window.setTimeout(makePng, 250);
    return () => window.clearTimeout(id);
  }, [tableHtml, loading]);

  function markSeen(wikiTitle: string) {
    setSeen((prev) => {
      const next = new Set(prev);
      next.add(wikiTitle);
      saveSeen(next);
      return next;
    });
  }

  function handleGuess() {
    if (!guess.trim() || answerRevealed) return;
    const correct = isCorrectGuess(guess, current);
    setGuess("");

    if (correct) {
      const result = computeRoundResult(strokesThisRound + 1, false);
      setRounds((r) => r + 1);
      setTotalVsPar((t) => t + result.scoreVsPar);
      setStreak((s) => (result.scoreVsPar <= 0 ? s + 1 : 0));
      setLastResult(result);
      setHoleHistory((h) => [...h, { golferName: current.displayName, imageUrl: meta.imageUrl, result, strokes: strokesThisRound + 1 }]);
      setMessage(`${result.label} — ${current.displayName}!`);
      setMessageTone("ok");
      setAnswerRevealed(true);
      markSeen(current.wikiTitle);
      return;
    }

    // Wrong guess: costs 1 stroke and auto-reveals the next hint
    setWrongGuessesThisRound((w) => w + 1);
    setHintLevel((h) => Math.min(h + 1, hints.length));
    setStreak(0);
    setMessage("Wrong — the next hint has been revealed.");
    setMessageTone("error");
  }

  function handleReveal() {
    if (answerRevealed) return;
    const result = computeRoundResult(strokesThisRound, true);
    setRounds((r) => r + 1);
    setTotalVsPar((t) => t + result.scoreVsPar);
    setStreak(0);
    setLastResult(result);
    setHoleHistory((h) => [...h, { golferName: current.displayName, imageUrl: meta.imageUrl, result, strokes: strokesThisRound }]);
    setAnswerRevealed(true);
    setMessage(`Answer was ${current.displayName}. Triple bogey — +3 vs par.`);
    setMessageTone("info");
    markSeen(current.wikiTitle);
  }

  function nextPlayer() {
    setGuess("");
    // After 9 holes show the scorecard (holeHistory already has the completed hole)
    if (holeHistory.length >= HOLES_PER_ROUND) {
      setShowScorecard(true);
      return;
    }
    const nextIdx = currentIndex + 1;
    if (nextIdx < shuffleBag.length) {
      setCurrentIndex(nextIdx);
    } else {
      // Rebuild bag excluding all golfers seen so far (including current)
      const newSeen = new Set(seen);
      newSeen.add(current.wikiTitle);
      const newBag = buildBag(newSeen);
      // If buildBag had to reset (all seen), clear localStorage seen set
      if (newBag.length === GOLFERS.length) {
        setSeen(new Set());
        saveSeen(new Set());
      }
      setShuffleBag(newBag);
      setCurrentIndex(0);
    }
  }

  function startNewRound() {
    setHoleHistory([]);
    setShowScorecard(false);
  }

  function revealHint() {
    if (answerRevealed) return;
    setHintLevel((h) => Math.min(h + 1, hints.length));
    setManualHintsRevealed((m) => m + 1);
  }

  return (
    // Desktop: lock to viewport height so each column scrolls independently.
    // Mobile: normal stacking layout with page scroll.
    <div className="flex min-h-svh flex-col bg-[#f6f3e8] text-slate-900 lg:h-svh">
      {showScorecard && (
        <ScorecardModal
          holeHistory={holeHistory}
          totalVsPar={totalVsPar}
          onNewRound={startNewRound}
        />
      )}
      <style>{WIKI_CSS}</style>

      {/* ── Header ── fixed height, never scrolls */}
      <header className="shrink-0 border-b border-slate-200/80 bg-[#f6f3e8]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-300 font-serif text-xl font-bold text-slate-900 shadow-sm">
              W
            </div>
            <div className="leading-tight">
              <div className="font-serif text-2xl tracking-tight">Wiki Yellow</div>
              <div className="text-[11px] text-slate-600">
                Guess the golfer from their Wikipedia grid
              </div>
            </div>
            <Badge
              variant="outline"
              className="ml-1 hidden rounded-full border-slate-300 bg-white/70 text-[10px] sm:inline-flex"
            >
              {SELF_TESTS_PASSED ? "live" : "parser warning"}
            </Badge>
          </motion.div>

          <div className="ml-auto">
            <Scoreboard
              totalVsPar={totalVsPar}
              rounds={rounds}
              streak={streak}
              lastResult={lastResult}
              strokesThisRound={strokesThisRound}
            />
          </div>
        </div>
      </header>

      {/* ── Main: fills remaining height, clips overflow on desktop ── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden px-4 md:px-8">

          {/* Two-column grid: each column scrolls independently on desktop */}
          <div className="flex-1 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5">

            {/* Left — wiki board scrolls within its column */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="scroll-col h-full overflow-y-auto py-5 md:py-6 lg:pr-1"
            >
              <BoardPanel
                loading={loading}
                error={error}
                pngDataUrl={pngDataUrl}
                tableHtml={tableHtml}
                captureRef={captureRef}
              />
            </motion.div>

            {/* Right — guess + hints, scrollable but rarely needs to be */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="scroll-col flex flex-col gap-3 overflow-y-auto py-5 md:py-6 lg:pl-0"
            >
              <GuessPanel
                guess={guess}
                setGuess={setGuess}
                handleGuess={handleGuess}
                suggestions={suggestions}
                answerRevealed={answerRevealed}
                message={message}
                messageTone={messageTone}
                currentName={current.displayName}
                imageUrl={meta.imageUrl}
                handleReveal={handleReveal}
                nextPlayer={nextPlayer}
                strokesThisRound={strokesThisRound}
                hintsUsed={hintLevel}
                totalHints={hints.length}
                holeNumber={holeHistory.length + 1}
              />
              <HintPanel
                hintLevel={hintLevel}
                hints={hints}
                onRevealNext={revealHint}
                answerRevealed={answerRevealed}
                labelOverrides={{ 1: majorHintLabel }}
              />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
