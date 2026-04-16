import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const LABELS = ["Build", "Wins by tour", "Nationality", "Peak ranking", "Obvious clue"];

function isHtmlHint(value: string): boolean {
  return /<\/?(table|tbody|tr|th|td)\b/i.test(value);
}

export function HintPanel({ hintLevel, hints }: { hintLevel: number; hints: string[] }) {
  return (
    <Card className="rounded-3xl border-slate-300 bg-[#fffdf7] shadow-sm">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Hint ladder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={(hintLevel / hints.length) * 100} className="h-2" />
        {LABELS.map((label, index) => {
          const revealed = hintLevel > index;
          const value = hints[index] || "";
          const renderAsHtml = revealed && label === "Wins by tour" && isHtmlHint(value);

          return (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-1 flex items-center justify-between">
                <div className="font-semibold text-slate-800">{label}</div>
                <Badge variant="outline">{revealed ? "revealed" : "hidden"}</Badge>
              </div>
              {revealed ? (
                renderAsHtml ? (
                  <div
                    className="wiki-tour-wins overflow-x-auto text-sm text-slate-700"
                    dangerouslySetInnerHTML={{ __html: value }}
                  />
                ) : (
                  <div className="whitespace-pre-line text-sm text-slate-700">{value}</div>
                )
              ) : (
                <div className="whitespace-pre-line text-sm text-slate-700">???</div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
