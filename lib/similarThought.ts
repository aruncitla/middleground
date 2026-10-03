import type { Entry } from '@/types/room';

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'to',
  'of',
  'for',
  'on',
  'in',
  'at',
  'it',
  'this',
  'that',
  'really',
  'just',
  'very',
  'and',
  'but',
  'yeah',
  'yup',
  'yep',
  'yes',
  'ok',
  'okay',
  'well',
  'like',
  'too',
  'also',
]);

const NEGATION = new Set([
  'not',
  'no',
  'never',
  'dont',
  'cant',
  'wont',
  'doesnt',
  'didnt',
  'isnt',
  'arent',
  'wasnt',
  'werent',
]);
const BETTER_WORSE = new Set(['better', 'worse']);

export type SimilarKind = 'exact' | 'strong' | 'similar';

export type SimilarMatch = {
  kind: SimilarKind;
  entry: Entry;
  tokenDice: number;
  containment: number;
  levenshtein: number;
};

export function foldContractions(text: string) {
  return text
    .replace(/won['’]t/gi, 'wont')
    .replace(/can['’]t/gi, 'cant')
    .replace(/don['’]t/gi, 'dont')
    .replace(/doesn['’]t/gi, 'doesnt')
    .replace(/didn['’]t/gi, 'didnt')
    .replace(/isn['’]t/gi, 'isnt')
    .replace(/aren['’]t/gi, 'arent')
    .replace(/wasn['’]t/gi, 'wasnt')
    .replace(/weren['’]t/gi, 'werent');
}

export function normalizeThought(text: string) {
  const folded = foldContractions(text).toLowerCase().trim();
  const stripped = folded.replace(/[^\p{L}\p{N}\s]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const tokens = stripped
    .split(' ')
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token))
    .map(singularize);
  return { text: tokens.join(' '), tokens };
}

function singularize(token: string) {
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

export function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j] ?? 0;
  }
  return prev[b.length] ?? 0;
}

export function levenshteinSimilarity(a: string, b: string) {
  const max = Math.max(a.length, b.length);
  if (!max) return 1;
  return 1 - levenshtein(a, b) / max;
}

function tokenSet(tokens: string[]) {
  return new Set(tokens);
}

function sharedCount(a: string[], b: string[]) {
  const other = tokenSet(b);
  let n = 0;
  const seen = new Set<string>();
  for (const token of a) {
    if (seen.has(token)) continue;
    if (other.has(token)) n += 1;
    seen.add(token);
  }
  return n;
}

function numberTokens(tokens: string[]) {
  return new Set(tokens.filter((token) => /^\d+$/.test(token)));
}

function negationTokens(tokens: string[]) {
  return new Set(tokens.filter((token) => NEGATION.has(token)));
}

function setEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

function contentTokens(tokens: string[]) {
  return tokens.filter((token) => !NEGATION.has(token));
}

function hasNegation(tokens: string[]) {
  return negationTokens(tokens).size > 0;
}

function shouldSkip(tokensA: string[], tokensB: string[]) {
  // Skip opposite polarity (one negated, one not). Matching negation words
  // (not vs doesn't) still count as the same polarity.
  if (hasNegation(tokensA) !== hasNegation(tokensB)) return true;
  if (!setEqual(numberTokens(tokensA), numberTokens(tokensB))) return true;
  const contentA = contentTokens(tokensA);
  const contentB = contentTokens(tokensB);
  const hasBwA = contentA.some((t) => BETTER_WORSE.has(t));
  const hasBwB = contentB.some((t) => BETTER_WORSE.has(t));
  if (hasBwA && hasBwB) {
    const startA = contentA[0];
    const startB = contentB[0];
    if (startA && startB && startA !== startB) return true;
  }
  return false;
}

function rank(kind: SimilarKind) {
  if (kind === 'exact') return 3;
  if (kind === 'strong') return 2;
  return 1;
}

function similarityScores(tokensA: string[], tokensB: string[]) {
  const a = contentTokens(tokensA);
  const b = contentTokens(tokensB);
  const shared = sharedCount(a, b);
  const tokenDice = a.length + b.length === 0 ? 1 : (2 * shared) / (a.length + b.length);
  const minLen = Math.min(a.length, b.length);
  const containment = minLen === 0 ? 0 : shared / minLen;
  const lev = levenshteinSimilarity(a.join(' '), b.join(' '));
  return { tokenDice, containment, levenshtein: lev };
}

export function classifySimilarity(draft: string, existing: string): SimilarKind | null {
  const a = normalizeThought(draft);
  const b = normalizeThought(existing);
  const aContent = contentTokens(a.tokens).join(' ');
  const bContent = contentTokens(b.tokens).join(' ');
  if (!aContent && !bContent) return 'exact';
  if (aContent === bContent) return 'exact';
  if (shouldSkip(a.tokens, b.tokens)) return null;
  const scores = similarityScores(a.tokens, b.tokens);
  if (scores.containment >= 0.9 && scores.levenshtein >= 0.72) return 'strong';
  if (scores.tokenDice >= 0.78 || scores.containment >= 0.82) return 'similar';
  return null;
}

export function findSimilarThought(draft: string, entries: Entry[]): SimilarMatch | null {
  const text = draft.trim();
  if (!text) return null;
  let best: SimilarMatch | null = null;
  for (const entry of entries) {
    const kind = classifySimilarity(text, entry.text);
    if (!kind) continue;
    const a = normalizeThought(text);
    const b = normalizeThought(entry.text);
    const scores = similarityScores(a.tokens, b.tokens);
    const next: SimilarMatch = { kind, entry, ...scores };
    if (!best || rank(kind) > rank(best.kind) || (kind === best.kind && scores.levenshtein > best.levenshtein)) {
      best = next;
    }
  }
  return best;
}
