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

export function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}
