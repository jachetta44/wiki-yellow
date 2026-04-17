import { Lock, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

/**
 * Hint ladder, ordered per spec:
 *   Build → Peak ranking → Wins by tour → Nationality → Lifeline
 * Each row reveals independently and costs 1 pt. Unrevealed rows show an
 * inline "Reveal (−1)" button; revealed rows show the content.
 */
const LABELS = ["Build", "Peak ranking", "Wins by tour", "Nationality", "Lifeline"];
const BLURBS = [
  "Height and weight from the infobox.",
  "Highest world-ranking peak.",
  "Win totals, broken out by tour.",
  "Citizenship / country represented.",
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
}: {
  hintLevel: number;
  hints: string[];
  onRevealNext: () => void;
  answerRevealed: boolean;
}) {
  const pct = (hintLevel / hints.length) * 100;

  return (
    <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-xl tracking-tight">Hint ladder</CardTitle>
          <span className="text-[11px] font-medium text-slate-500">
            {hintLevel} / {hints.length} used
          </span>
        </div>
        <Progress value={pct} className="mt-2 h-1.5" />
      </CardHeader>

      <CardContent className="pt-0">
        <ul className="divide-y divide-slate-100">
          {LABELS.map((label, index) => {
            const revealed = hintLevel > index;
            const value = hints[index] || "";
            const isNext = !revealed && index === hintLevel;
            const renderAsHtml = revealed && label === "Wins by tour" && isHtmlHint(value);
            const isLifeline = label === "Lifeline";

            return (
              <li
                key={label}
                className={[
                  "py-2.5",
                  isNext && !answerRevealed ? "-mx-2 rounded-xl bg-amber-50/60 px-2" : "",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {label}
                      </span>
                      {isLifeline && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                          lifeline
                        </span>
                      )}
                    </div>
                    {revealed ? (
                      renderAsHtml ? (
                        <div
                          className="wiki-tour-wins mt-1.5 text-sm text-slate-700"
                          dangerouslySetInnerHTML={{ __html: value }}
                        />
                      ) : (
                        <div className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                          {value}
                        </div>
                      )
                    ) : (
                      <div className="mt-0.5 text-xs text-slate-500">{BLURBS[index]}</div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {revealed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                        <Eye className="h-3 w-3" /> shown
                      </span>
                    ) : isNext && !answerRevealed ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-full border-amber-300 bg-white px-3 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                        onClick={onRevealNext}
                      >
                        Reveal −1
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        <Lock className="h-3 w-3" /> locked
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
