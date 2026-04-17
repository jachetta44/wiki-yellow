import { Flame } from "lucide-react";

const FEDORA_SRC = "/fedora_hat_transparent.png";

/**
 * Compact horizontal stats strip that lives in the top header.
 * Replaces the previous 2x2 card grid so we don't eat precious vertical
 * space in the right-hand rail.
 */
export function Scoreboard({
  score,
  rounds,
  streak,
  roundPoints,
  maxRoundPoints,
}: {
  score: number;
  rounds: number;
  streak: number;
  roundPoints: number;
  maxRoundPoints: number;
}) {
  const isHotStreak = streak >= 3;
  const isFedoraStreak = streak >= 5;
  const avg = rounds ? (score / rounds).toFixed(1) : "—";

  const stats: Array<{ label: string; value: string; sub?: string; accent?: boolean }> = [
    { label: "Score", value: String(score), sub: `avg ${avg}/rd` },
    { label: "Rounds", value: String(rounds) },
    {
      label: "Round points",
      value: `${roundPoints}/${maxRoundPoints}`,
      sub: "−1 per hint",
      accent: true,
    },
  ];

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {stats.map((item) => (
        <div
          key={item.label}
          className={[
            "flex min-w-[96px] flex-col justify-center rounded-2xl border px-3 py-2 shadow-sm",
            item.accent
              ? "border-amber-300 bg-amber-50"
              : "border-slate-200 bg-white/90",
          ].join(" ")}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {item.label}
          </div>
          <div className="mt-0.5 text-xl font-bold leading-none text-slate-900">
            {item.value}
          </div>
          {item.sub && (
            <div className="mt-1 text-[10px] text-slate-500">{item.sub}</div>
          )}
        </div>
      ))}

      {/* Streak pill with fire / fedora visual */}
      <div
        className={[
          "relative flex min-w-[132px] items-center gap-3 rounded-2xl border px-3 py-2 shadow-sm",
          isHotStreak
            ? "border-red-300 bg-red-50"
            : "border-slate-200 bg-white/90",
        ].join(" ")}
      >
        <div className="flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Streak
          </div>
          <div className="mt-0.5 text-sm font-medium text-slate-700">
            {isFedoraStreak ? "Fedora" : isHotStreak ? "Hot" : "Current"}
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
