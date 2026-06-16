import { RotateCcw, Search, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/helpers";
import { PAR, parLabel } from "@/App";

export function GuessPanel({
  guess,
  setGuess,
  handleGuess,
  suggestions,
  answerRevealed,
  message,
  messageTone,
  currentName,
  imageUrl,
  handleReveal,
  nextPlayer,
  strokesThisRound,
  hintsUsed,
  totalHints,
}: {
  guess: string;
  setGuess: (value: string) => void;
  handleGuess: () => void;
  suggestions: string[];
  answerRevealed: boolean;
  message: string;
  messageTone: "info" | "ok" | "error";
  currentName: string;
  imageUrl: string | null;
  handleReveal: () => void;
  nextPlayer: () => void;
  strokesThisRound: number;
  hintsUsed: number;
  totalHints: number;
}) {
  const toneClass =
    messageTone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : messageTone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-slate-200 bg-white text-slate-800";

  const scoreVsPar = strokesThisRound - PAR;
  const onForLabel = parLabel(scoreVsPar);

  const pillAccent =
    scoreVsPar < 0
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : scoreVsPar === 0
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-rose-100 text-rose-800 border-rose-200";

  return (
    <div className="rounded-3xl border border-slate-200 bg-[#fffdf7] p-3 shadow-sm">
      <div className="space-y-2.5">
        {/* Slim status row */}
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${pillAccent}`}>
            For: {onForLabel}
          </span>
          <span className="text-[11px] text-slate-500">
            {strokesThisRound} stroke{strokesThisRound !== 1 ? "s" : ""} · par {PAR} · {hintsUsed}/{totalHints} hints
          </span>
        </div>

        {/* Guess input */}
        <div className="flex gap-2">
          <Input
            id="wy-guess"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { handleGuess(); }
              if (e.key === "Tab" && suggestions.length > 0) {
                e.preventDefault();
                setGuess(suggestions[0]);
              }
            }}
            placeholder="Enter golfer name…"
            disabled={answerRevealed}
            className="h-9 flex-1 rounded-xl border-slate-300 bg-white text-sm"
            autoComplete="off"
          />
          <Button
            onClick={handleGuess}
            disabled={answerRevealed || !guess.trim()}
            className="h-9 rounded-xl bg-slate-900 px-3 text-white hover:bg-slate-800"
          >
            <Search className="mr-1 h-3.5 w-3.5" />
            Guess
          </Button>
        </div>

        {/* Autocomplete suggestions */}
        {guess.trim() && suggestions.length > 0 && !answerRevealed && (
          <div className="flex flex-wrap gap-1">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setGuess(name)}
                className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700 transition hover:bg-slate-50"
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Feedback */}
        {message && (
          <div className={`rounded-xl border px-2.5 py-1.5 text-xs ${toneClass}`}>
            {message}
          </div>
        )}

        {/* Revealed state + next */}
        {answerRevealed && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {imageUrl ? (
                <img src={imageUrl} alt={currentName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-slate-700">{getInitials(currentName)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Revealed</div>
              <div className="truncate text-sm font-semibold text-slate-900">{currentName}</div>
            </div>
            <Button
              onClick={nextPlayer}
              className="h-8 rounded-xl bg-slate-900 px-3 text-xs text-white hover:bg-slate-800"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Next
            </Button>
          </div>
        )}

        {/* Give up */}
        {!answerRevealed && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-xl text-xs"
            onClick={handleReveal}
          >
            <Flag className="mr-1 h-3 w-3" />
            Give up
          </Button>
        )}
      </div>
    </div>
  );
}
