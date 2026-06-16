import { Flame } from "lucide-react";
import { RoundResult, PAR, parLabel } from "@/App";

const FEDORA_SRC = "/fedora_hat_transparent.png";

function formatVsPar(n: number): string {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

function accentForVsPar(n: number): string {
  if (n < 0) return "border-emerald-300 bg-emerald-50 text-emerald-900";
  if (n === 0) return "border-slate-200 bg-white/90 text-slate-900";
  if (n <= 2) return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-red-300 bg-red-50 text-red-900";
}

export function Scoreboard({
  totalVsPar,
  rounds,
  streak,
  lastResult,
  strokesThisRound,
}: {
  totalVsPar: number;
  rounds: number;
  streak: number;
  lastResult: RoundResult | null;
  strokesThisRound: number;
}) {
  const isHotStreak = streak >= 3;
  const isFedoraStreak = streak >= 5;

  // "On for" label based on current round's stroke count (not yet finished)
  const onForLabel = parLabel(strokesThisRound - PAR);

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {/* Total vs par */}
      <div
        className={[
          "flex min-w-[88px] flex-col justify-center rounded-2xl border px-3 py-2 shadow-sm",
          accentForVsPar(totalVsPar),
        ].join(" ")}
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-60">
          Total vs par
        </div>
        <div className="mt-0.5 text-xl font-bold leading-none">
          {formatVsPar(totalVsPar)}
        </div>
        <div className="mt-1 text-[10px] opacity-60">{rounds} round{rounds !== 1 ? "s" : ""}</div>
      </div>

      {/* Current round — what you're on track for */}
      <div className="flex min-w-[96px] flex-col justify-center rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 shadow-sm">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
          For
        </div>
        <div className="mt-0.5 text-base font-bold leading-none text-amber-900">
          {onForLabel}
        </div>
        <div className="mt-1 text-[10px] text-amber-700">
          {strokesThisRound} stroke{strokesThisRound !== 1 ? "s" : ""} · par {PAR}
        </div>
      </div>

      {/* Last result */}
      {lastResult && (
        <div className="flex min-w-[88px] flex-col justify-center rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Last hole
          </div>
          <div className="mt-0.5 text-base font-bold leading-none text-slate-900">
            {lastResult.label}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">
            {formatVsPar(lastResult.scoreVsPar)} vs par
          </div>
        </div>
      )}

      {/* Streak */}
      <div
        className={[
          "relative flex min-w-[120px] items-center gap-3 rounded-2xl border px-3 py-2 shadow-sm",
          isHotStreak ? "border-red-300 bg-red-50" : "border-slate-200 bg-white/90",
        ].join(" ")}
      >
        <div className="flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Streak
          </div>
          <div className="mt-0.5 text-sm font-medium text-slate-700">
            {isFedoraStreak ? "Fedora" : isHotStreak ? "Hot" : "Par or better"}
          </div>
        </div>
        <div className="relative flex h-11 w-11 items-center justify-center">
          <div
            className={[
              "flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-slate-900",
              isHotStreak ? "border-2 border-red-500" : "border border-slate-300",
            ].join(" ")}
          >
            {streak}
          </div>
          {!isFedoraStreak && isHotStreak && (
            <Flame className="pointer-events-none absolute -right-1.5 -top-1.5 h-4 w-4 text-red-500" />
          )}
          {isFedoraStreak && (
            <img
              src={FEDORA_SRC}
              alt=""
              aria-hidden
              className="pointer-events-none absolute -top-4 left-1/2 w-11 -translate-x-[45%] rotate-[18deg] drop-shadow-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}
