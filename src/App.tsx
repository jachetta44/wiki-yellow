import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WIKI_CSS } from "@/lib/constants";
import { runSelfTests, normalizeName, pickRandomDifferent } from "@/lib/helpers";
import { fetchWikiMarkup, findMajorTables, cleanTablesHtml, extractInfoboxData } from "@/lib/wiki";
import { GOLFERS } from "@/data/golfers";
import { BoardPanel } from "@/components/BoardPanel";
import { GuessPanel } from "@/components/GuessPanel";
import { HintPanel } from "@/components/HintPanel";
import { Scoreboard } from "@/components/Scoreboard";
import { Golfer, MetaInfo } from "@/components/types";

const SELF_TESTS_PASSED = runSelfTests();

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
  const [current, setCurrent] = useState(() => GOLFERS[Math.floor(Math.random() * GOLFERS.length)]);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
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
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const captureRef = useRef<HTMLDivElement | null>(null);

  const accuracy = useMemo(() => (rounds ? Math.round((score / rounds) * 100) : 0), [score, rounds]);
  const hints = useMemo(
    () => [
      meta.heightWeight || "Build unavailable on the page.",
      meta.tourWins || "Wins by tour unavailable.",
      meta.nationality || "Nationality unavailable.",
      meta.topRanking || "Reached the very top end of world golf.",
      current.obviousClue,
    ],
    [meta, current]
  );

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
      setAnswerRevealed(false);
      setMessage("");
      setDebugInfo([]);

      try {
        const html = await fetchWikiMarkup(current.wikiTitle);
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(html, "text/html");
        const tables = findMajorTables(doc);
        const info = extractInfoboxData(doc);
        const nextDebug = [
          `Player: ${current.wikiTitle}`,
          `Self-tests passed: ${SELF_TESTS_PASSED ? "yes" : "no"}`,
          `Infobox found: ${info.infoboxFound ? "yes" : "no"}`,
          `Build hint: ${info.heightWeight || "missing"}`,
          `Wins by tour: ${info.tourWins || "missing"}`,
          `Nationality: ${info.nationality || "missing"}`,
          `Peak ranking: ${info.topRanking || "missing"}`,
          `Major tables found: ${tables.length}`,
        ];
        if (!tables.length) {
          throw new Error("Could not locate the major championship results table on this Wikipedia page.");
        }
        setTableHtml(cleanTablesHtml(tables));
        setMeta(info);
        setDebugInfo(nextDebug);
      } catch (err) {
        const text = err instanceof Error ? err.message : "Failed to load this golfer.";
        if (!cancelled) {
          setError(text);
          setDebugInfo((prev) => [...prev, `Error: ${text}`]);
        }
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
    if (!guess.trim()) return;
    const correct = isCorrectGuess(guess, current);
    setRounds((r) => r + 1);

    if (correct) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
      setMessage(`Correct — it was ${current.displayName}.`);
      setAnswerRevealed(true);
      return;
    }

    setStreak(0);
    setMessage("Wrong guess — streak reset. Reveal a hint or keep firing.");
  }

  function handleReveal() {
    if (!answerRevealed) {
      setRounds((r) => r + 1);
      setStreak(0);
    }
    setAnswerRevealed(true);
    setMessage(`Answer revealed: ${current.displayName}.`);
  }

  function nextPlayer() {
    setGuess("");
    setCurrent((prev) => pickRandomDifferent(prev.wikiTitle, GOLFERS));
  }

  function revealHint() {
    setHintLevel((h) => Math.min(h + 1, hints.length));
  }

  return (
    <div className="min-h-screen bg-[#f6f3e8] text-slate-900">
      <style>{WIKI_CSS}</style>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="rounded-3xl border-slate-300 bg-white/90 shadow-sm">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="rounded-full bg-yellow-300 text-slate-900 hover:bg-yellow-300">
                  Wikipedia-style guessing game
                </Badge>
                <Badge variant="outline" className="rounded-full border-slate-300 bg-slate-50">
                  Wiki Yellow
                </Badge>
              </div>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="font-serif text-4xl tracking-tight">Wiki Yellow</CardTitle>
                  <CardDescription className="mt-2 max-w-2xl text-base text-slate-700">
                    Identify the golfer from their Wikipedia major championships grid.
                  </CardDescription>
                </div>
                <div className="text-xs text-slate-400">Self-tests: {SELF_TESTS_PASSED ? "pass" : "check parser"}</div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_340px] lg:items-start">
          <BoardPanel
            loading={loading}
            error={error}
            pngDataUrl={pngDataUrl}
            tableHtml={tableHtml}
            captureRef={captureRef}
          />

          <div className="space-y-4 lg:sticky lg:top-6">
            <Scoreboard score={score} rounds={rounds} accuracy={accuracy} streak={streak} />
            <GuessPanel
              guess={guess}
              setGuess={setGuess}
              handleGuess={handleGuess}
              suggestions={suggestions}
              answerRevealed={answerRevealed}
              message={message}
              currentName={current.displayName}
              imageUrl={meta.imageUrl}
              revealHint={revealHint}
              handleReveal={handleReveal}
              nextPlayer={nextPlayer}
            />
            <HintPanel hintLevel={hintLevel} hints={hints} />
          </div>
        </div>
      </div>
    </div>
  );
}
