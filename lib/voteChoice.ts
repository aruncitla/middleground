export type VoteChoice = 'agree' | 'disagree' | 'maybe';

export const VOTE_LABELS: Record<VoteChoice, string> = {
  disagree: 'Not for me',
  maybe: 'Maybe',
  agree: 'Works for me',
};

export const VOTE_STAMPS: Record<VoteChoice, string> = {
  disagree: 'NOT FOR ME',
  maybe: 'MAYBE',
  agree: 'WORKS FOR ME',
};

export type BucketCounts = {
  agree: number;
  disagree: number;
  maybe: number;
  total: number;
};

export function isVoteChoice(value: unknown): value is VoteChoice {
  return value === 'agree' || value === 'disagree' || value === 'maybe';
}

export function bucketCounts(card: {
  agreeCount?: number;
  disagreeCount?: number;
  maybeCount?: number;
}): BucketCounts {
  const agree = Math.max(0, card.agreeCount ?? 0);
  const disagree = Math.max(0, card.disagreeCount ?? 0);
  const maybe = Math.max(0, card.maybeCount ?? 0);
  return { agree, disagree, maybe, total: agree + disagree + maybe };
}

export function percents(counts: BucketCounts) {
  if (counts.total <= 0) {
    return { agree: 0, disagree: 0, maybe: 0 };
  }
  const agree = Math.round((counts.agree / counts.total) * 100);
  const disagree = Math.round((counts.disagree / counts.total) * 100);
  const maybe = Math.max(0, 100 - agree - disagree);
  return { agree, disagree, maybe };
}

/** Largest single bucket ÷ total votes, as a 0–100 score. A hard split stays ~50. */
export function agreementScore(counts: BucketCounts) {
  if (counts.total <= 0) return 0;
  const largest = Math.max(counts.agree, counts.disagree, counts.maybe);
  return Math.round((largest / counts.total) * 100);
}

/** Average of per-question agreement scores. */
export function discussionScore(cards: { agreeCount?: number; disagreeCount?: number; maybeCount?: number }[]) {
  const voted = cards.filter((card) => bucketCounts(card).total > 0);
  if (!voted.length) return 0;
  const sum = voted.reduce((acc, card) => acc + agreementScore(bucketCounts(card)), 0);
  return Math.round(sum / voted.length);
}

export function countField(choice: VoteChoice) {
  if (choice === 'agree') return 'agreeCount' as const;
  if (choice === 'disagree') return 'disagreeCount' as const;
  return 'maybeCount' as const;
}

export function tickPosition(choice: VoteChoice, salt = 0) {
  const jitter = ((salt % 7) - 3) * 0.012;
  if (choice === 'disagree') return Math.max(0.04, Math.min(0.28, 0.16 + jitter));
  if (choice === 'maybe') return Math.max(0.42, Math.min(0.58, 0.5 + jitter));
  return Math.max(0.72, Math.min(0.96, 0.84 + jitter));
}
