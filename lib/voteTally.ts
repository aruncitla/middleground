import { voterId } from '@/lib/seatsLocal';
import type { Card, Vote } from '@/types/room';

export function voteKey(vote: Pick<Vote, 'id' | 'uid' | 'seatId' | 'cardId'>) {
  return vote.id || `${voterId(vote)}_${vote.cardId}`;
}

export function mergeVotes(server: Vote[], local: Vote[]): Vote[] {
  const map = new Map<string, Vote>();
  for (const vote of server) map.set(voteKey(vote), vote);
  for (const vote of local) {
    const key = voteKey(vote);
    const current = map.get(key);
    if (!current || current.choice !== vote.choice) map.set(key, vote);
  }
  return [...map.values()];
}

export function withVoteTallies(cards: Card[], votes: Vote[]): Card[] {
  const byCard = new Map<string, { agree: number; disagree: number }>();
  for (const vote of votes) {
    const row = byCard.get(vote.cardId) ?? { agree: 0, disagree: 0 };
    if (vote.choice === 'agree') row.agree += 1;
    else row.disagree += 1;
    byCard.set(vote.cardId, row);
  }
  return cards.map((card) => {
    const row = byCard.get(card.id) ?? { agree: 0, disagree: 0 };
    return { ...card, agreeCount: row.agree, disagreeCount: row.disagree };
  });
}

export function optimisticVote(opts: {
  uid: string;
  seatId: string;
  cardId: string;
  choice: 'agree' | 'disagree';
}): Vote {
  return {
    id: `${opts.seatId}_${opts.cardId}`,
    uid: opts.uid,
    seatId: opts.seatId,
    cardId: opts.cardId,
    choice: opts.choice,
  };
}
