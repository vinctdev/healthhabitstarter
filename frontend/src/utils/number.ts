/** True if any of the given input strings parses to a negative number. */
export const hasNegative = (...values: string[]): boolean =>
  values.some((value) => parseFloat(value) < 0);
