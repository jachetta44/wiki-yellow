import { Golfer } from "@/components/types";

export function normalizeName(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function cleanText(value: string | null | undefined): string {
  return String(value || "")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\.mw-parser-output[^]*/g, "")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function firstMatch(value: string | null | undefined, patterns: RegExp[]): string | null {
  const cleaned = cleanText(value);
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}

export function formatHeightWeight(heightRaw: string | null, weightRaw: string | null): string | null {
  const height = cleanText(heightRaw);
  const weight = cleanText(weightRaw);
  const heightUS = firstMatch(height, [/\b\d\s*ft\s*\d{1,2}\s*in\b/i, /\b\d\s*ft\b/i]);
  const weightUS = firstMatch(weight, [/\b\d{2,3}\s*lb\b/i]);
  if (heightUS && weightUS) return `${heightUS} / ${weightUS}`;

  const heightMetric = firstMatch(height, [/\b\d\.\d{1,2}\s*m\b/i, /\b\d{2,3}\s*cm\b/i]);
  const weightMetric = firstMatch(weight, [/\b\d{2,3}\s*kg\b/i]);
  if (heightMetric && weightMetric) return `${heightMetric} / ${weightMetric}`;

  return [heightUS || heightMetric, weightUS || weightMetric].filter(Boolean).join(" / ") || null;
}

export function getInitials(name: string): string {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function pickRandomDifferent(currentTitle: string, golfers: Golfer[]): Golfer {
  const pool = golfers.filter((g) => g.wikiTitle !== currentTitle);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function runSelfTests(): boolean {
  return [
    formatHeightWeight("5 ft 9 in (1.75 m)", "161 lb (73 kg)") === "5 ft 9 in / 161 lb",
    formatHeightWeight("1.75 m", "73 kg") === "1.75 m / 73 kg",
    normalizeName("Pádraig Harrington") === "padraig harrington",
    cleanText("A [1]  B") === "A B",
  ].every(Boolean);
}

// ---------- Daily puzzle seeding ----------

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getTodayString(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function getDaySeed(): number {
  return Math.floor(Date.now() / 86400000); // days since epoch UTC
}

function seededSample<T>(arr: T[], n: number, rng: () => number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    result.push(...copy.splice(idx, 1));
  }
  return result;
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getDailyGolfers(golfers: Golfer[]): Golfer[] {
  const rng = mulberry32(getDaySeed());
  const legends = golfers.filter(g => g.era === 'legend');
  const classics = golfers.filter(g => g.era === 'classic');
  const moderns = golfers.filter(g => g.era === 'modern');
  const picked = [
    ...seededSample(legends, 2, rng),
    ...seededSample(classics, 3, rng),
    ...seededSample(moderns, 4, rng),
  ];
  return seededShuffle(picked, rng);
}

export function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}
