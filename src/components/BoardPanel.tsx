import { Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function BoardPanel({
  loading,
  error,
  pngDataUrl,
  tableHtml,
  captureRef,
}: {
  loading: boolean;
  error: string;
  pngDataUrl: string;
  tableHtml: string;
  captureRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="gap-2 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-serif text-2xl tracking-tight">
            Major championship results
          </CardTitle>
          <Badge variant="outline" className="rounded-full border-slate-300 bg-slate-50 text-[11px]">
            live from Wikipedia
          </Badge>
        </div>
        <CardDescription className="text-slate-600">
          Green = win · Yellow = top-10 · T# = tied. Deduce the golfer from
          the grid and use the hint ladder at right if you need help.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="flex min-h-[440px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600">
            Loading Wikipedia board…
          </div>
        ) : error ? (
          <Alert className="rounded-2xl border-red-200 bg-red-50">
            <Info className="h-4 w-4" />
            <AlertTitle>Couldn’t load that board</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-auto rounded-2xl border border-slate-200 bg-[#f8f9fa] p-3">
            {pngDataUrl ? (
              <img
                src={pngDataUrl}
                alt="Wikipedia-style screenshot of a golfer's major championship results timeline"
                className="h-auto w-full rounded-xl border border-slate-200 bg-white"
              />
            ) : (
              <div className="overflow-auto rounded-xl border border-slate-200 bg-white p-2">
                <div
                  className="wiki-capture"
                  dangerouslySetInnerHTML={{
                    __html: `<h2>Results timeline</h2><em>Major championship results</em>${tableHtml}`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Off-screen capture source for html-to-image */}
        <div className="absolute left-[-9999px] top-0" aria-hidden>
          <div
            ref={captureRef}
            className="wiki-capture"
            dangerouslySetInnerHTML={{
              __html: `<h2>Results timeline</h2><em>Major championship results</em>${tableHtml}`,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
