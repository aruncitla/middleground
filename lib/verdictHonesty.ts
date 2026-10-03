import { bucketCounts } from '@/lib/voteChoice';
import { voterId } from '@/lib/seatsLocal';
import type { Card, Vote } from '@/types/room';

export function totalRoomVotes(votes: Vote[]) {
  return votes.length;
}

export function distinctVoterCount(votes: Vote[]) {
  return new Set(votes.map((vote) => voterId(vote))).size;
}

export function thoughtsWithVotesCount(cards: Pick<Card, 'agreeCount' | 'disagreeCount' | 'maybeCount'>[]) {
  return cards.filter((card) => bucketCounts(card).total > 0).length;
}

export function canShowDiscussionScore(
  votes: Vote[],
  cards: Pick<Card, 'agreeCount' | 'disagreeCount' | 'maybeCount'>[],
) {
  return totalRoomVotes(votes) >= 5 && thoughtsWithVotesCount(cards) >= 2;
}

export function isEarlySignal(votes: Vote[]) {
  return totalRoomVotes(votes) < 10 || distinctVoterCount(votes) < 3;
}
