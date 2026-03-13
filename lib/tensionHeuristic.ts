// lib/tensionHeuristic.ts
// Lightweight tension detection v1.1: surface unresolved strategic forks from text.
// Heuristic-only; no semantic analysis. Understate: if signal is weak, return null.

const MAX_LABEL_LEN = 48;

/**
 * Normalize a candidate label: trim, collapse whitespace, truncate.
 */
function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL_LEN);
}

/**
 * Detect competing-option language and return { left, right } or null.
 * Patterns: "X vs Y", "Path A: ... Path B: ...", "one option ... another option", etc.
 */
export function detectTensionFromText(text: string | null | undefined): { left: string; right: string } | null {
  const raw = (text ?? '').trim();
  if (raw.length < 20) return null;

  const lower = raw.toLowerCase();

  // 1. "X vs Y" — clear fork
  const vsMatch = raw.match(/\s+vs\.?\s+/i);
  if (vsMatch) {
    const idx = raw.toLowerCase().indexOf(' vs');
    const leftPart = raw.slice(0, idx).trim();
    const rightPart = raw.slice(idx + (vsMatch[0]?.length ?? 0)).trim();
    const left = norm(leftPart);
    const right = norm(rightPart);
    if (left.length >= 3 && right.length >= 3) return { left, right };
  }

  // 2. "Path A : ... Path B : ..." or "path a ... path b"
  const pathA = /path\s+a\s*:?\s*([^.]{10,120}?)(?=\s*path\s+b|$)/i.exec(raw);
  const pathB = /path\s+b\s*:?\s*([^.]{10,120}?)(?=\s*path\s+a|$)/i.exec(raw);
  if (pathA?.[1] && pathB?.[1]) {
    const a = norm(pathA[1]);
    const b = norm(pathB[1]);
    if (a.length >= 5 && b.length >= 5) return { left: a, right: b };
  }

  // 3. "one option ... another option" — extract phrases after each
  const oneOpt = /one\s+option\s*:?\s*([^.]{8,80}?)(?=\s*[.;]|\s+another\s+option)/i.exec(raw);
  const anotherOpt = /another\s+option\s*:?\s*([^.]{8,80}?)(?=\s*[.;]|$)/i.exec(raw);
  if (oneOpt?.[1] && anotherOpt?.[1]) {
    const left = norm(oneOpt[1]);
    const right = norm(anotherOpt[1]);
    if (left.length >= 5 && right.length >= 5) return { left, right };
  }

  // 4. "tradeoff between X and Y" or "X and Y" as pair
  const tradeoff = /tradeoff\s+between\s+([^.]{8,60}?)\s+and\s+([^.]{8,60}?)(?=\s*[.;]|$)/i.exec(raw);
  if (tradeoff && tradeoff[1] && tradeoff[2]) {
    const left = norm(tradeoff[1]);
    const right = norm(tradeoff[2]);
    if (left.length >= 3 && right.length >= 3) return { left, right };
  }

  // 5. "two possible paths: ... and ..." — weak; only use if we can split on " and " or " / "
  const twoPaths = /two\s+possible\s+paths\s*:?\s*([^.]{15,200}?)(?=\s*[.;]|$)/i.exec(raw);
  if (twoPaths?.[1]) {
    const block = twoPaths[1];
    const andSplit = block.split(/\s+and\s+|\s*\/\s*/i);
    if (andSplit.length >= 2) {
      const left = norm(andSplit[0]!);
      const right = norm(andSplit[andSplit.length - 1]!);
      if (left.length >= 5 && right.length >= 5) return { left, right };
    }
  }

  // 6. "original strategy vs alternative" style
  const origAlt = /original\s+strategy\s+vs\.?\s+([^.]{8,60}?)(?=\s*[.;]|$)/i.exec(raw);
  if (origAlt?.[1]) {
    const right = norm(origAlt[1]);
    if (right.length >= 5) return { left: 'Original strategy', right };
  }

  return null;
}
