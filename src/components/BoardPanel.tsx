import { Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function BoardPanel({
  loading,
  error,
  pngDataUrl,
  tableHtml,
  captureRef,
  topContent,
}: {
  loading: boolean;
  error: string;
  pngDataUrl: string;
  tableHtml: string;
  captureRef: React.RefObject<HTMLDivElement | null>;
  topContent?: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden rounded-3xl border-slate-300 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Major performances graphic</CardTitle>
        <CardDescription className="mt-1 text-slate-600">
          This board is pulled from the golfer’s Wikipedia page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {topContent}

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-slate-600">
            Loading Wikipedia board…
          </div>
        ) : error ? (
          <Alert className="rounded-2xl border-red-200 bg-red-50">
            <Info className="h-4 w-4" />
            <AlertTitle>Couldn’t load that board</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-auto rounded-3xl border border-slate-300 bg-[#f8f9fa] p-3">
            {pngDataUrl ? (
              <img
                src={pngDataUrl}
                alt="Wikipedia-style screenshot of a golfer's major championship results timeline"
                className="h-auto w-full rounded-2xl border border-slate-200 bg-white"
              />
            ) : (
              <div className="overflow-auto rounded-2xl border border-slate-200 bg-white p-2">
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
