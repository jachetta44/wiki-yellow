import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import { Badge } from "@/components/ui/badge";
import { WIKI_CSS } from "@/lib/constants";
import { runSelfTests, normalizeName, shuffleArray } from "@/lib/helpers";
import { fetchWikiMarkup, findMajorTables, cleanTablesHtml, extractInfoboxData } from "@/lib/wiki";
import { GOLFERS } from "@/data/golfers";
import { BoardPanel } from "@/components/BoardPanel";
import { GuessPanel } from "@/components/GuessPanel";
import { HintPanel } from "@/components/HintPanel";
import { Scoreboard } from "@/components/Scoreboard";
import { Golfer, MetaInfo } from "@/components/types";

const SELF_TESTS_PASSED = runSelfTests();
const MAX_ROUND_POINTS = 5;

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
  imageUrl: null,
  infoboxFound: false,
};

export default function App() {
  const [shuffleBag, setShuffleBag] = useState(() => shuffleArray(GOLFERS));
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = shuffleBag[currentIndex];

  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "ok" | "error">("info");
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pngDataUrl, setPngDataUrl] = useState("");
  const [tableHtml, setTableHtml] = useState("");
  const [meta, setMeta] = useState<MetaInfo>(EMPTY_META);
  const captureRef = useRef<HTMLDivElement | null>(null);

  // Hint ladder: Build → Peak ranking → Wins → Nationality → Lifeline
  const hints = useMemo(
    () => [
      meta.heightWeight || "Build unavailable on the page.",
      meta.topRanking || "Reached the very top end of world golf.",
      meta.tourWins || "Wins by tour unavailable.",
      meta.nationality || "Nationality unavailable.",
      current.lifeline,
    ],
    [meta, current]
  );

  const roundPoints = Math.max(0, MAX_ROUND_POINTS - hintLevel);

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

  // Load the Wikipedia page whenever `current` changes.
  useEffect(() => {
    let cancelled = false;
    async function loadPlayer() {
      setLoading(true);
      setError("");
      setPngDataUrl("");
      setTableHtml("");
      setMeta(EMPTY_META);
      setHintLevel(0);
      setAnswerRevealed(false);
      setMessage("");
      setMessageTone("info");

      try {
        const html = await fetchWikiMarkup(current.wikiTitle);
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(html, "text/html");
        const tables = findMajorTables(doc);
        const info = extractInfoboxData(doc);
        if (!tables.length) {
          throw new Error("Could not locate the major championship results table on this Wikipedia page.");
        }
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
    return () => {
      cancelled = true;
    };
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

  function handleGuess() {
    if (!guess.trim() || answerRevealed) return;
    const correct = isCorrectGuess(guess, current);

    if (correct) {
      setRounds((r) => r + 1);
      setScore((s) => s + roundPoints);
      setStreak((s) => s + 1);
      setMessage(
        `Correct — it was ${current.displayName}. +${roundPoints} point${
          roundPoints === 1 ? "" : "s"
        } this round.`
      );
      setMessageTone("ok");
      setAnswerRevealed(true);
      return;
    }

    setStreak(0);
    setMessage("Wrong guess — streak reset. Try again or reveal a hint.");
    setMessageTone("error");
  }

  function handleReveal() {
    if (!answerRevealed) {
      setRounds((r) => r + 1);
      setStreak(0);
    }
    setAnswerRevealed(true);
    setMessage(`Answer revealed: ${current.displayName}. 0 pts this round.`);
    setMessageTone("info");
  }

  function nextPlayer() {
    setGuess("");
    setCurrentIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      if (nextIndex >= shuffleBag.length) {
        const reshuffled = shuffleArray(GOLFERS);
        setShuffleBag(reshuffled);
        return 0;
      }
      return nextIndex;
    });
  }

  function revealHint() {
    if (answerRevealed) return;
    setHintLevel((h) => Math.min(h + 1, hints.length));
  }

  return (
    <div className="min-h-screen bg-[#f6f3e8] text-slate-900">
      <style>{WIKI_CSS}</style>

      {/* Slim top strip — title on the left, scoreboard pills on the right */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f6f3e8]/90 backdrop-blur">
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
              score={score}
              rounds={rounds}
              streak={streak}
              roundPoints={roundPoints}
              maxRoundPoints={MAX_ROUND_POINTS}
            />
          </div>
        </div>
      </header>

      {/* Main grid — board on the left, sticky action rail on the right */}
      <main className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <BoardPanel
              loading={loading}
              error={error}
              pngDataUrl={pngDataUrl}
              tableHtml={tableHtml}
              captureRef={captureRef}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="flex flex-col gap-4 lg:sticky lg:top-[88px]"
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
              roundPoints={roundPoints}
              maxRoundPoints={MAX_ROUND_POINTS}
              hintsUsed={hintLevel}
              totalHints={hints.length}
            />
            <HintPanel
              hintLevel={hintLevel}
              hints={hints}
              onRevealNext={revealHint}
              answerRevealed={answerRevealed}
            />
          </motion.div>
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-[11px] text-slate-500 md:px-8">
        Wiki Yellow is an unofficial fan project. Major-result graphics and
        player infobox data are fetched live from Wikipedia.
      </footer>
    </div>
  );
}
