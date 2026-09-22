import { voterId } from '@/lib/seatsLocal';
import type { Card, Vote } from '@/types/room';

export function voteKey(vote: Pick<Vote, 'uid' | 'seatId' | 'cardId'>) {
  return `${voterId(vote)}_${vote.cardId}`;
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

function createdAtMs(card: Pick<Card, 'createdAt'>) {
  const value = card.createdAt;
  if (!value) return Number.MAX_SAFE_INTEGER;
  return value.getTime();
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const byTime = createdAtMs(a) - createdAtMs(b);
    if (byTime !== 0) return byTime;
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });
}

export function seatVotedOnCard(votes: Vote[], seatId: string, cardId: string) {
  return votes.some((vote) => vote.cardId === cardId && voterId(vote) === seatId);
}

export function choiceForSeat(votes: Vote[], seatId: string | undefined, cardId: string) {
  if (!seatId) return undefined;
  return votes.find((vote) => vote.cardId === cardId && voterId(vote) === seatId)?.choice;
}

export function seatCompletedDeck(votes: Vote[], seatId: string, cardIds: string[]) {
  return cardIds.length > 0 && cardIds.every((cardId) => seatVotedOnCard(votes, seatId, cardId));
}

export function rosterSeatIds(seats: { id: string }[], participants: { id: string }[]) {
  if (seats.length) return seats.map((seat) => seat.id);
  return participants.map((person) => person.id);
}

export function seatStartedVoting(votes: Vote[], seatId: string, cardIds: string[]) {
  if (!cardIds.length) return votes.some((vote) => voterId(vote) === seatId);
  return cardIds.some((cardId) => seatVotedOnCard(votes, seatId, cardId));
}

export function seatsStartedCount(rosterIds: string[], votes: Vote[], cardIds: string[]) {
  return rosterIds.filter((id) => seatStartedVoting(votes, id, cardIds)).length;
}

export function seatsFinishedCount(rosterIds: string[], votes: Vote[], cardIds: string[]) {
  return rosterIds.filter((id) => seatCompletedDeck(votes, id, cardIds)).length;
}

export function allSeatsCompletedDeck(rosterIds: string[], votes: Vote[], cardIds: string[]) {
  return rosterIds.length > 0 && cardIds.length > 0 && rosterIds.every((id) => seatCompletedDeck(votes, id, cardIds));
}

export function cardVotingComplete(votes: Vote[], rosterIds: string[], cardId: string) {
  return rosterIds.length > 0 && rosterIds.every((id) => seatVotedOnCard(votes, id, cardId));
}
