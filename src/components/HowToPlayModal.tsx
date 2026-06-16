import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------- Looping demo ----------

const DEMO_FRAMES = [
  { hint: null,                            guess: "",           result: null,       label: "The grid is shown — golfer name hidden" },
  { hint: "🇦🇺  Australian",              guess: "",           result: null,       label: "Reveal a hint to narrow it down…" },
  { hint: "🇦🇺  Australian",              guess: "Adam Scott", result: null,       label: "Type your guess" },
  { hint: "🇦🇺  Australian",              guess: "Adam Scott", result: "birdie",   label: "Birdie! One hint used 🐦" },
];

const FRAME_MS = 1400;

function DemoAnimation() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % DEMO_FRAMES.length), FRAME_MS);
    return () => clearInterval(id);
  }, []);

  const f = DEMO_FRAMES[frame];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#f6f3e8] p-3">
      {/* Mini board placeholder */}
      <div className="mb-2.5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Major Championship Grid</span>
          <span className="text-[10px] text-slate-400">name hidden</span>
        </div>
        {/* Fake table rows */}
        <div className="p-2 space-y-1">
          {["Masters", "U.S. Open", "The Open", "PGA Champ."].map((major, i) => (
            <div key={major} className="flex items-center gap-1.5">
              <div className="w-20 shrink-0 rounded bg-slate-100 px-1.5 py-1 text-[9px] font-medium text-slate-600">{major}</div>
              {[...Array(5)].map((_, j) => (
                <div
                  key={j}
                  className={`h-5 w-7 rounded text-[8px] font-bold flex items-center justify-center ${
                    i === 0 && j === 2 ? "bg-amber-300 text-amber-900" :
                    i === 2 && j === 1 ? "bg-amber-300 text-amber-900" :
                    "bg-slate-50 text-slate-300"
                  }`}
                >
                  {i === 0 && j === 2 ? "Won" : i === 2 && j === 1 ? "Won" : "—"}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Mini hint */}
      <div className={`mb-2 rounded-xl border px-3 py-1.5 text-xs transition-all duration-300 ${f.hint ? "border-teal-200 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-400"}`}>
        {f.hint ?? "Hint 1: Nationality — locked"}
      </div>

      {/* Mini input */}
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition-all duration-300 ${f.result === "birdie" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
        <span className={`flex-1 ${f.guess ? "text-slate-900 font-medium" : "text-slate-400"}`}>
          {f.guess || "Enter golfer name…"}
        </span>
        {f.result === "birdie" && <span className="text-base">🐦</span>}
      </div>

      {/* Caption */}
      <div className="mt-2 text-center text-[10px] text-slate-500">{f.label}</div>

      {/* Progress dots */}
      <div className="mt-2 flex justify-center gap-1">
        {DEMO_FRAMES.map((_, i) => (
          <div key={i} className={`h-1 w-4 rounded-full transition-all duration-300 ${i === frame ? "bg-slate-700" : "bg-slate-200"}`} />
        ))}
      </div>
    </div>
  );
}

// ---------- Scoring row ----------

function ScoreRow({ emoji, label, desc }: { emoji: string; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl w-7 text-center">{emoji}</span>
      <span className="text-xs font-semibold text-slate-800 w-24 shrink-0">{label}</span>
      <span className="text-xs text-slate-500">{desc}</span>
    </div>
  );
}

// ---------- Modal ----------

const SEEN_KEY = "wiki-yellow-howtoplay-v1";

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-[#f6f3e8] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#fffdf7] px-5 py-4">
          <div>
            <div className="font-serif text-lg tracking-tight text-slate-900">How to Play</div>
            <div className="text-[11px] text-slate-500">Wiki Yellow ⛳</div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[80vh] p-4 space-y-4">
          {/* Demo */}
          <DemoAnimation />

          {/* Rules */}
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">How it works</div>
            {[
              "Each hole shows a golfer's Wikipedia major championship grid — with their name hidden.",
              "Use up to 3 hints: Nationality → Major result location → Lifeline.",
              "Each wrong guess automatically reveals the next hint.",
              "Guess correctly before all hints run out for the best score.",
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">{i + 1}</span>
                {rule}
              </div>
            ))}
          </div>

          {/* Scoring */}
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Scoring — par 3</div>
            <ScoreRow emoji="🏌️" label="Hole in One" desc="Correct with no hints used" />
            <ScoreRow emoji="🐦" label="Birdie −1"   desc="Correct after 1 hint" />
            <ScoreRow emoji="⛳" label="Par"          desc="Correct after 2 hints" />
            <ScoreRow emoji="🟠" label="Bogey +1"     desc="Correct after 3 hints" />
            <ScoreRow emoji="🟥" label="Triple +3"    desc="Give up" />
          </div>

          {/* Daily / Infinite */}
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-yellow-700 mb-1">Modes</div>
            <div className="text-xs text-slate-700">
              <span className="font-semibold">Daily —</span> everyone plays the same 9 golfers. Resets at midnight UTC. Share your emoji scorecard.
            </div>
            <div className="text-xs text-slate-700">
              <span className="font-semibold">Infinite —</span> play as many rounds as you want, randomly drawn each time.
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-[#fffdf7] px-4 py-3">
          <Button
            className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            onClick={onClose}
          >
            Let's play
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useHowToPlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        setOpen(true);
        localStorage.setItem(SEEN_KEY, "1");
      }
    } catch {}
  }, []);

  return { open, setOpen };
}
