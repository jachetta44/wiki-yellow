import { Clue } from "./types";

/**
 * Renders a clue according to its `kind`. Visual variety is deliberate —
 * a flag pill reads differently than a bar chart reads differently than
 * a big stat call-out, so the daily puzzle doesn't feel like a stack of
 * identical cards.
 */
export function ClueCard({ clue }: { clue: Clue }) {
  switch (clue.kind) {
    case "flag":
      return <FlagClue clue={clue} />;
    case "text":
      return <TextClue clue={clue} />;
    case "stat":
      return <StatClue clue={clue} />;
    case "wins-chart":
      return <WinsChartClue clue={clue} />;
    case "tour-wins":
      return <TourWinsClue clue={clue} />;
    case "major-venue":
      return <MajorVenueClue clue={clue} />;
    case "swing-silhouette":
      return <SwingSilhouetteClue clue={clue} />;
    case "placeholder":
      return <PlaceholderClue clue={clue} />;
    case "lifeline":
      return <LifelineClue clue={clue} />;
  }
}

function FlagClue({
  clue,
}: {
  clue: Extract<Clue, { kind: "flag" }>;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-br from-sky-50 to-slate-50 text-2xl">
        {clue.emoji || "🏳️"}
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Country
        </div>
        <div className="text-base font-semibold text-slate-900">
          {clue.country}
        </div>
      </div>
    </div>
  );
}

function TextClue({
  clue,
}: {
  clue: Extract<Clue, { kind: "text" }>;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {clue.label}
      </div>
      <div className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-slate-800">
        {clue.value}
      </div>
    </div>
  );
}

function StatClue({
  clue,
}: {
  clue: Extract<Clue, { kind: "stat" }>;
}) {
  const accent = clue.accent || "default";
  const palette = {
    default: "border-slate-200 bg-slate-50 text-slate-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  }[accent];

  return (
    <div className={`rounded-xl border px-3 py-2 ${palette}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">
        {clue.label}
      </div>
      <div className="mt-0.5 text-lg font-bold leading-tight">
        {clue.value}
      </div>
      {clue.secondary && (
        <div className="mt-0.5 text-[11px] opacity-75">{clue.secondary}</div>
      )}
    </div>
  );
}

function WinsChartClue({
  clue,
}: {
  clue: Extract<Clue, { kind: "wins-chart" }>;
}) {
  const max = Math.max(1, ...clue.data.map((d) => d.count));
  // Normalize bars — tallest is 44px, others proportional.
  const BAR_MAX = 44;
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {clue.label}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <div className="flex items-end gap-0.5" style={{ height: BAR_MAX + 18 }}>
          {clue.data.map((d) => {
            const h = d.count === 0 ? 2 : Math.max(4, Math.round((d.count / max) * BAR_MAX));
            return (
              <div
                key={d.year}
                className="flex flex-1 min-w-[8px] flex-col items-center gap-0.5"
                title={`${d.year}: ${d.count} win${d.count === 1 ? "" : "s"}`}
              >
                <div
                  className={[
                    "w-full rounded-t",
                    d.count === 0 ? "bg-slate-200" : "bg-amber-400",
                  ].join(" ")}
                  style={{ height: h }}
                />
                <div className="text-[8px] font-medium leading-none text-slate-500">
                  {String(d.year).slice(2)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1 text-[10px] text-slate-500">
          PGA Tour wins per calendar year
        </div>
      </div>
    </div>
  );
}

function LifelineClue({
  clue,
}: {
  clue: Extract<Clue, { kind: "lifeline" }>;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
          Lifeline
        </span>
        <span className="rounded-full bg-amber-200/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-800">
          almost a giveaway
        </span>
      </div>
      <div className="mt-1 whitespace-pre-line text-sm leading-relaxed text-amber-950">
        {clue.value}
      </div>
    </div>
  );
}

function SwingSilhouetteClue({
  clue,
}: {
  clue: Extract<Clue, { kind: "swing-silhouette" }>;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
          Swing silhouette
        </span>
        <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
          down the line
        </span>
      </div>
      {clue.assetUrl ? (
        <video
          src={clue.assetUrl}
          autoPlay
          muted
          loop
          playsInline
          className="mt-2 aspect-video w-full rounded-lg bg-black object-contain"
        />
      ) : (
        <div className="mt-2 flex aspect-video items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800 text-center text-[11px] leading-snug text-slate-400">
          <div className="px-3">
            <div className="font-semibold text-slate-300">
              silhouette coming soon
            </div>
            <div className="mt-0.5">
              We haven't processed this golfer's swing clip yet.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TourWinsClue({
  clue,
}: {
  clue: Extract<Clue, { kind: "tour-wins" }>;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Wins by tour
      </div>
      <div
        className="wiki-tour-wins overflow-auto rounded-xl border border-slate-200 bg-white text-sm"
        dangerouslySetInnerHTML={{ __html: clue.html }}
      />
    </div>
  );
}

function MajorVenueClue({
  clue,
}: {
  clue: Extract<Clue, { kind: "major-venue" }>;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
        Last major venue · {clue.year}
      </div>
      <div className="mt-0.5 text-lg font-bold leading-tight text-emerald-900">
        {clue.course || "Venue unknown"}
      </div>
      {clue.location && (
        <div className="mt-0.5 text-sm font-medium text-emerald-800">
          {clue.location}
        </div>
      )}
      <div className="mt-1 text-[11px] text-emerald-600">
        {clue.witty
          ? "Tough luck — it's always Augusta! 🏌️"
          : clue.tournament}
      </div>
    </div>
  );
}

function PlaceholderClue({
  clue,
}: {
  clue: Extract<Clue, { kind: "placeholder" }>;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {clue.label}
      </div>
      <div className="mt-0.5 text-sm italic text-slate-600">{clue.reason}</div>
    </div>
  );
}
