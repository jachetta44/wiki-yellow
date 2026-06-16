import { Lock, Eye, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEFAULT_LABELS = ["Nationality", "Best major result location", "Lifeline"];
const BLURBS = [
  "Citizenship / country represented.",
  "Course and location of their most recent major win (or best result).",
  "A last-resort personal tell — almost gives it away.",
];

function isHtmlHint(value: string): boolean {
  return /<\/?(table|tbody|tr|th|td)\b/i.test(value);
}

export function HintPanel({
  hintLevel,
  hints,
  onRevealNext,
  answerRevealed,
  labelOverrides = {},
}: {
  hintLevel: number;
  hints: string[];
  onRevealNext: () => void;
  answerRevealed: boolean;
  labelOverrides?: Record<number, string>;
}) {
  const allRevealed = hintLevel >= hints.length;
  const canReveal = !allRevealed && !answerRevealed;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
        <span className="font-serif text-base font-semibold tracking-tight text-slate-900">Hints</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">{hintLevel}/{hints.length}</span>
          <Button
            size="sm"
            onClick={onRevealNext}
            disabled={!canReveal}
            className={[
              "h-6 rounded-full px-2.5 text-[11px] font-semibold",
              canReveal
                ? "bg-amber-400 text-slate-900 hover:bg-amber-300"
                : "bg-slate-100 text-slate-400",
            ].join(" ")}
          >
            <Lightbulb className="mr-1 h-3 w-3" />
            {allRevealed ? "All shown" : "Reveal"}
          </Button>
        </div>
      </div>

      {/* Hint rows */}
      <ul className="divide-y divide-slate-100 px-3">
        {DEFAULT_LABELS.map((defaultLabel, index) => {
          const label = labelOverrides[index] ?? defaultLabel;
          const revealed = hintLevel > index;
          const value = hints[index] || "";
          const isNext = !revealed && index === hintLevel;
          const renderAsHtml = revealed && defaultLabel === "Wins by tour" && isHtmlHint(value);
          const isLifeline = defaultLabel === "Lifeline";

          return (
            <li
              key={defaultLabel}
              className={[
                "py-2",
                isNext && !answerRevealed ? "-mx-3 bg-amber-50/70 px-3" : "",
              ].join(" ")}
            >
              <div className="flex items-start gap-2">
                {/* Number bubble */}
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900">{label}</span>
                    {isLifeline && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700">
                        lifeline
                      </span>
                    )}
                    {isNext && !answerRevealed && (
                      <span className="rounded-full bg-amber-200/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-800">
                        next
                      </span>
                    )}
                  </div>

                  {revealed ? (
                    renderAsHtml ? (
                      <div
                        className="wiki-tour-wins mt-1 text-xs text-slate-700"
                        dangerouslySetInnerHTML={{ __html: value }}
                      />
                    ) : (
                      <div className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-slate-700">
                        {value}
                      </div>
                    )
                  ) : (
                    <div className="mt-0.5 text-[11px] text-slate-400">{BLURBS[index]}</div>
                  )}
                </div>

                {/* Lock / eye icon */}
                <div className="shrink-0 pt-0.5">
                  {revealed ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Eye className="h-3 w-3" />
                    </div>
                  ) : (
                    <div
                      className={[
                        "flex h-5 w-5 items-center justify-center rounded-full",
                        isNext && !answerRevealed
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-400",
                      ].join(" ")}
                    >
                      <Lock className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
