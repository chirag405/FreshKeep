export type DateCandidate = {
  iso: string; // YYYY-MM-DD
  confidence: 'high' | 'low';
  raw: string; // the matched substring, for showing "found: EXP 09/26"
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const fullYear = year < 100 ? 2000 + year : year;
  // Reject calendar-invalid combinations (31 Apr, 30 Feb, 29 Feb on a
  // non-leap year, ...) rather than silently emitting a date that a later
  // `new Date(...)` would roll forward with no indication anything was wrong.
  const d = new Date(fullYear, month - 1, day);
  if (d.getFullYear() !== fullYear || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return `${fullYear}-${pad(month)}-${pad(day)}`;
}

/**
 * Extracts candidate expiry dates from raw OCR text. Printed dates are
 * messy — curved packaging, stamped ink, many locales — so this returns
 * every plausible match ranked by confidence rather than picking one.
 * Manual entry always stays available as a fallback in the UI regardless.
 */
export function extractDateCandidates(text: string): DateCandidate[] {
  const candidates: DateCandidate[] = [];

  // "12 JUL 2026", "12 Jul 26" — day, month name, year (high confidence: unambiguous format)
  const dayMonthYear = /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{2,4})\b/gi;
  for (const m of text.matchAll(dayMonthYear)) {
    const day = Number(m[1]);
    const month = MONTHS[m[2].toLowerCase()];
    const year = Number(m[3]);
    const iso = toIso(year, month, day);
    if (iso) candidates.push({ iso, confidence: 'high', raw: m[0] });
  }

  // "2026-07-14", "2026/07/14" — ISO-ish, unambiguous (high confidence)
  const isoLike = /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/g;
  for (const m of text.matchAll(isoLike)) {
    const iso = toIso(Number(m[1]), Number(m[2]), Number(m[3]));
    if (iso) candidates.push({ iso, confidence: 'high', raw: m[0] });
  }

  // "EXP 09/26", "BEST BEFORE 09/2026" — month/year only, no day (low confidence:
  // ambiguous day, default to the 1st; also ambiguous DD/MM vs MM/YY without context)
  const monthYearOnly = /\b(?:exp(?:iry)?|best before|use by|bb)[.:\s]*(\d{1,2})[-/](\d{2,4})\b/gi;
  for (const m of text.matchAll(monthYearOnly)) {
    const month = Number(m[1]);
    const year = Number(m[2]);
    const iso = toIso(year, month, 1);
    if (iso) candidates.push({ iso, confidence: 'low', raw: m[0] });
  }

  // "14/07/2026", "14/07/26" — numeric D/M/Y (low confidence: could be M/D/Y in
  // some locales; we assume D/M/Y since the product spec targets non-US labels)
  const numericDMY = /\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/g;
  for (const m of text.matchAll(numericDMY)) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const iso = toIso(year, month, day);
    if (iso && !candidates.some((c) => c.raw === m[0])) {
      candidates.push({ iso, confidence: 'low', raw: m[0] });
    }
  }

  // De-duplicate by ISO date, keeping the highest confidence match for each.
  const byIso = new Map<string, DateCandidate>();
  for (const c of candidates) {
    const existing = byIso.get(c.iso);
    if (!existing || (existing.confidence === 'low' && c.confidence === 'high')) {
      byIso.set(c.iso, c);
    }
  }

  return Array.from(byIso.values()).sort((a, b) => (a.confidence === b.confidence ? 0 : a.confidence === 'high' ? -1 : 1));
}
