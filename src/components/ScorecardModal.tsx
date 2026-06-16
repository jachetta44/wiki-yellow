import { Share2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoleRecord, holeEmoji, PAR } from "@/App";
import { getInitials } from "@/lib/helpers";

function formatVsPar(n: number): string {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

function scoreAccent(scoreVsPar: number, snowman: boolean): string {
  if (snowman) return "bg-blue-50 border-blue-200 text-blue-900";
  if (scoreVsPar <= -2) return "bg-emerald-50 border-emerald-300 text-emerald-900";
  if (scoreVsPar === -1) return "bg-teal-50 border-teal-200 text-teal-900";
  if (scoreVsPar === 0) return "bg-slate-50 border-slate-200 text-slate-700";
  if (scoreVsPar === 1) return "bg-amber-50 border-amber-200 text-amber-900";
  return "bg-red-50 border-red-200 text-red-900";
}

function totalAccent(n: number): string {
  if (n < 0) return "border-emerald-300 bg-emerald-50 text-emerald-900";
  if (n === 0) return "border-slate-200 bg-white text-slate-900";
  if (n <= 4) return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-red-300 bg-red-50 text-red-900";
}

export function ScorecardModal({
  holeHistory,
  totalVsPar,
  mode,
  onNewRound,
  onSwitchToInfinite,
}: {
  holeHistory: HoleRecord[];
  totalVsPar: number;
  mode: 'daily' | 'infinite';
  onNewRound: () => void;
  onSwitchToInfinite: () => void;
}) {
  const roundVsPar = holeHistory.reduce((sum, h) => sum + h.result.scoreVsPar, 0);

  function buildShareText(): string {
    const emojis = holeHistory.map((h) => holeEmoji(h.result)).join(" ");
    const score = roundVsPar === 0 ? "E" : roundVsPar > 0 ? `+${roundVsPar}` : `${roundVsPar}`;
    return `Wiki Yellow ⛳ — Front Nine\n${emojis}\n${score} · wikiyellow.com`;
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(buildShareText());
    } catch {
      // fallback silent
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-[#f6f3e8] shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 bg-[#fffdf7] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-serif text-xl tracking-tight text-slate-900">Front Nine</div>
              <div className="text-xs text-slate-500">Wiki Yellow ⛳</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {mode === 'daily' && (
                <span className="rounded-full bg-yellow-300 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-900">
                  Daily
                </span>
              )}
              <div
                className={[
                  "flex flex-col items-center rounded-2xl border px-4 py-2",
                  totalAccent(roundVsPar),
                ].join(" ")}
              >
                <div className="text-2xl font-bold leading-none">{formatVsPar(roundVsPar)}</div>
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide opacity-60">
                  this round
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3×3 hole grid */}
        <div className="grid grid-cols-3 gap-2 p-4">
          {holeHistory.map((hole, i) => (
            <div
              key={i}
              className={[
                "flex flex-col items-center gap-1.5 rounded-2xl border p-3",
                scoreAccent(hole.result.scoreVsPar, hole.result.snowman),
              ].join(" ")}
            >
              {/* Hole number */}
              <div className="self-start text-[10px] font-semibold uppercase tracking-widest opacity-50">
                Hole {i + 1}
              </div>

              {/* Golfer photo / initials */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/60 bg-white/50 shadow-sm">
                {hole.imageUrl ? (
                  <img src={hole.imageUrl} alt={hole.golferName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-slate-600">{getInitials(hole.golferName)}</span>
                )}
              </div>

              {/* Golfer name */}
              <div className="w-full truncate text-center text-[11px] font-medium leading-tight opacity-80">
                {hole.golferName}
              </div>

              {/* Emoji + score label */}
              <div className="text-2xl leading-none">{holeEmoji(hole.result)}</div>
              <div className="text-center text-[11px] font-semibold leading-tight">
                {hole.result.label}
              </div>
              <div className="text-[10px] opacity-60">
                {hole.strokes} stroke{hole.strokes !== 1 ? "s" : ""} · {formatVsPar(hole.result.scoreVsPar)}
              </div>
            </div>
          ))}
        </div>

        {/* Emoji strip for sharing */}
        <div className="mx-4 mb-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-center">
          <div className="text-lg leading-relaxed tracking-wide">
            {holeHistory.map((h) => holeEmoji(h.result)).join(" ")}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {formatVsPar(roundVsPar)} · par {PAR * 9} · wikiyellow.com
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-4 pb-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl border-slate-300"
              onClick={handleShare}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Copy score
            </Button>
            {mode === 'infinite' ? (
              <Button
                className="flex-1 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                onClick={onNewRound}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                New round
              </Button>
            ) : (
              <Button
                className="flex-1 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                onClick={onSwitchToInfinite}
              >
                Keep playing →
              </Button>
            )}
          </div>
          {mode === 'daily' && (
            <p className="text-center text-[11px] text-slate-400">
              Daily round complete — come back tomorrow for a new nine.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
