import { Camera, Lightbulb, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/helpers";

export function GuessPanel({
  guess,
  setGuess,
  handleGuess,
  suggestions,
  answerRevealed,
  message,
  currentName,
  imageUrl,
  revealHint,
  handleReveal,
  nextPlayer,
}: {
  guess: string;
  setGuess: (value: string) => void;
  handleGuess: () => void;
  suggestions: string[];
  answerRevealed: boolean;
  message: string;
  currentName: string;
  imageUrl: string | null;
  revealHint: () => void;
  handleReveal: () => void;
  nextPlayer: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#fffdf7] p-3 shadow-sm">
      <div className="mb-2">
        <div className="font-serif text-lg text-slate-900">Make your guess</div>
        <div className="mt-1 text-xs leading-5 text-slate-600">
          Wrong guesses reset your streak. Used hints do not.
        </div>
      </div>

      <Input
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleGuess();
        }}
        placeholder="Enter golfer name"
        className="h-9 rounded-xl border-slate-300 bg-white"
      />

      {guess.trim() && suggestions.length > 0 && !answerRevealed && (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Suggestions</div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setGuess(name)}
                className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs text-slate-800 transition hover:bg-slate-100"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
          {message}
        </div>
      )}

      {answerRevealed && (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {imageUrl ? (
                <img src={imageUrl} alt={currentName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-700">
                  {getInitials(currentName)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Revealed player</div>
              <div className="truncate font-semibold text-slate-900">{currentName}</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <Button onClick={handleGuess} size="sm" className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
          <Search className="mr-2 h-4 w-4" />
          Guess
        </Button>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={revealHint}>
          <Lightbulb className="mr-2 h-4 w-4" />
          Hint
        </Button>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={handleReveal}>
          <Camera className="mr-2 h-4 w-4" />
          Reveal
        </Button>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={nextPlayer}>
          <RotateCcw className="mr-2 h-4 w-4" />
          New player
        </Button>
      </div>
    </div>
  );
}
