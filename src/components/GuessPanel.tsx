import { RotateCcw, Search, XOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { getInitials } from "@/lib/helpers";

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
  roundPoints,
  maxRoundPoints,
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
  roundPoints: number;
  maxRoundPoints: number;
  hintsUsed: number;
  totalHints: number;
}) {
  const toneClass =
    messageTone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : messageTone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-slate-200 bg-white text-slate-800";

  return (
    <Card className="rounded-3xl border-slate-200 bg-[#fffdf7] shadow-sm">
      <CardContent className="space-y-3 p-4">
        {/* Round-points banner — the stakes */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
              This round is worth
            </div>
            <div className="mt-0.5 text-2xl font-bold leading-none text-amber-900">
              {roundPoints}{" "}
              <span className="text-sm font-medium text-amber-700">
                / {maxRoundPoints} pts
              </span>
            </div>
          </div>
          <div className="text-right text-[11px] leading-tight text-amber-800">
            <div className="font-semibold">
              {hintsUsed}/{totalHints} hints used
            </div>
            <div>−1 pt per hint</div>
          </div>
        </div>

        {/* Primary action: type + submit */}
        <div>
          <label
            htmlFor="wy-guess"
            className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
          >
            Your guess
          </label>
          <div className="flex gap-2">
            <Input
              id="wy-guess"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGuess();
              }}
              placeholder="Enter golfer name…"
              disabled={answerRevealed}
              className="h-10 flex-1 rounded-xl border-slate-300 bg-white"
              autoComplete="off"
            />
            <Button
              onClick={handleGuess}
              disabled={answerRevealed || !guess.trim()}
              className="h-10 rounded-xl bg-slate-900 px-4 text-white hover:bg-slate-800"
            >
              <Search className="mr-1.5 h-4 w-4" />
              Guess
            </Button>
          </div>

          {guess.trim() && suggestions.length > 0 && !answerRevealed && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setGuess(name)}
                  className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-50"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Feedback / answer reveal */}
        {message && (
          <div className={`rounded-2xl border px-3 py-2 text-sm ${toneClass}`}>
            {message}
          </div>
        )}

        {answerRevealed && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {imageUrl ? (
                <img src={imageUrl} alt={currentName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-slate-700">
                  {getInitials(currentName)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Revealed
              </div>
              <div className="truncate font-semibold text-slate-900">{currentName}</div>
            </div>
            <Button
              onClick={nextPlayer}
              className="h-9 rounded-xl bg-slate-900 px-3 text-white hover:bg-slate-800"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Next
            </Button>
          </div>
        )}

        {/* Secondary actions */}
        {!answerRevealed && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={handleReveal}
            >
              <XOctagon className="mr-1.5 h-4 w-4" />
              Give up
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={nextPlayer}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Skip
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
