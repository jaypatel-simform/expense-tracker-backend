/** Convert a Prisma Decimal (or number/string/null) to a plain number. */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value as any);
}

/** Round to 2 decimal places, avoiding floating point noise. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
