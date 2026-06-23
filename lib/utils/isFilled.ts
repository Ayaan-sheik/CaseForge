/**
 * A case-study value is "filled" when it has real content — non-empty and not a
 * `[NEEDS INPUT: …]` placeholder. Public renderers (web page, PDF) use this to
 * omit unfilled sections so external viewers never see raw flags, while the
 * flags stay stored for the creator to act on.
 */
export function isFilled(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.trim().length > 0 && !value.trim().startsWith('[NEEDS INPUT');
}
