/**
 * Lightweight className joiner.
 * Accepts any mix of strings, falsy values and arrays.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
