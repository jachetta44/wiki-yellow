import { Info } from "lucide-react";
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
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-serif text-2xl tracking-tight text-slate-900">
            Major championship results
          </div>
          <Badge variant="outline" className="rounded-full border-slate-300 bg-slate-50 text-[11px]">
            live from Wikipedia
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Green = win · Yellow = top-10 · T# = tied. Deduce the golfer from
          the grid and use the hint ladder at right if you need help.
        </p>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex min-h-[440px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600">
            Loading Wikipedia board…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>
                <div className="text-sm font-semibold text-red-900">Couldn't load that board</div>
                <div className="mt-0.5 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
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
      </div>
    </div>
  );
}
