import type { StatFormula } from "./model";

export function resolveFormula(formula: StatFormula, stats: Readonly<Record<number, number>>): number {
  const raw = (formula.terms ?? []).reduce(
    (value, term) => value + (stats[term.statId] ?? 0) * term.multiplier,
    formula.base,
  );
  return Math.max(formula.minimum ?? -Infinity, Math.min(formula.maximum ?? Infinity, raw));
}
