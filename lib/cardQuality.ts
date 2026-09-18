const GENERIC_FILLER = [
  /^nobody mentioned constraints or tradeoffs for:/i,
  /split the difference instead of picking one side/i,
];

export function isGenericFillerText(text: string) {
  const t = text.trim();
  if (!t) return true;
  return GENERIC_FILLER.some((re) => re.test(t));
}

export function isUsableThought(text: string) {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length < 2) return false;
  if (/^test\.?$/i.test(t)) return false;
  if (isGenericFillerText(t)) return false;
  return true;
}
