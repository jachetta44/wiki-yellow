import { Card, CardContent } from "@/components/ui/card";

const FEDORA_SRC = "/fedora_hat_transparent.png";

export function Scoreboard({
  score,
  rounds,
  accuracy,
  streak,
}: {
  score: number;
  rounds: number;
  accuracy: number;
  streak: number;
}) {
  const isHotStreak = streak >= 3;
  const isFedoraStreak = streak >= 5;

  const statItems = [
    { label: "Score", value: String(score) },
    { label: "Rounds", value: String(rounds) },
    { label: "Accuracy", value: `${accuracy}%` },
  ];

  return (
    <Card className="rounded-3xl border-slate-300 bg-[#fffdf7] shadow-sm">
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {item.label}
              </div>
              <div className="mt-1 text-2xl font-bold leading-none text-slate-900">
                {item.value}
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Streak
                </div>
                <div className="mt-1 text-sm font-medium text-slate-700">
                  {isFedoraStreak
                    ? "Fedora streak"
                    : isHotStreak
                    ? "Hot streak"
                    : "Current streak"}
                </div>
              </div>

              <div className="shrink-0">
                <div className="relative h-[70px] w-[70px]">
                  <div
                    className={[
                      "absolute inset-[6px] flex items-center justify-center rounded-full text-3xl font-bold text-slate-900",
                      isHotStreak
                        ? "border-[6px] border-red-500 shadow-[0_0_0_5px_rgba(239,68,68,0.10)]"
                        : "border border-slate-200",
                    ].join(" ")}
                  >
                    {streak}
                  </div>

                  {!isFedoraStreak && isHotStreak && (
                    <div
                      className="pointer-events-none absolute -bottom-0.5 -right-0.5 z-10 text-[26px] leading-none"
                      aria-hidden
                    >
                      🔥
                    </div>
                  )}

                  {isFedoraStreak && (
                    <img
                      src={FEDORA_SRC}
                      alt=""
                      aria-hidden
                      className="pointer-events-none absolute -top-3 left-1/2 z-20 w-[58px] -translate-x-[40%] rotate-[18deg] drop-shadow-sm"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
