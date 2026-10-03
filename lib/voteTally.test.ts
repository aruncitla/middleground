import {
  allSeatsCompletedDeck,
  cardVotingComplete,
  choiceForSeat,
  mergeVotes,
  seatCompletedDeck,
  seatsFinishedCount,
  seatsStartedCount,
  sortCards,
  voteKey,
  voteScreenForSeat,
  withVoteTallies,
} from './voteTally';
import type { Card, Vote } from '@/types/room';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const adaA: Vote = { id: 'sAAA_c1', uid: 'u1', seatId: 'sAAA', cardId: 'c1', choice: 'agree' };
const adaB: Vote = { id: 'sBBB_c1', uid: 'u1', seatId: 'sBBB', cardId: 'c1', choice: 'agree' };
const adaACard2: Vote = { id: 'sAAA_c2', uid: 'u1', seatId: 'sAAA', cardId: 'c2', choice: 'agree' };
const localChange: Vote = { id: 'sAAA_c1', uid: 'u1', seatId: 'sAAA', cardId: 'c1', choice: 'disagree' };

assert(voteKey(adaA) === 'sAAA_c1' && voteKey(adaB) === 'sBBB_c1', 'vote keys are seat id + card id');
assert(voteKey(adaA) !== voteKey(adaB), 'identical names still produce two vote keys');

const merged = mergeVotes([adaA], [adaB, localChange]);
assert(merged.length === 2, 'two seats stay two votes');
assert(merged.find((v) => v.seatId === 'sAAA')?.choice === 'disagree', 'optimistic choice wins until server catches up');
assert(choiceForSeat(merged, 'sAAA', 'c1') === 'disagree', 'highlight follows the active seat id');
assert(choiceForSeat(merged, 'sBBB', 'c1') === 'agree', 'the other identical seat keeps its own vote');

const cards: Card[] = [
  { id: 'c2', text: 'Later', kind: 'synthesized', order: 1, agreeCount: 0, disagreeCount: 0, maybeCount: 0, createdAt: new Date('2026-01-02') },
  { id: 'c1', text: 'Goa', kind: 'synthesized', order: 0, agreeCount: 99, disagreeCount: 99, maybeCount: 0, createdAt: new Date('2026-01-01') },
];
const sorted = sortCards(cards);
assert(sorted[0]?.id === 'c1' && sorted[1]?.id === 'c2', 'cards sort by createdAt then id');
assert(sortCards(sorted)[0]?.id === 'c1', 'sort is stable across rerenders');

const tallied = withVoteTallies(cards, merged);
assert(tallied.find((c) => c.id === 'c1')?.agreeCount === 1, 'UI tallies follow votes, not stale counters');
assert(tallied.find((c) => c.id === 'c1')?.disagreeCount === 1, 'two identical-name seats both count');
const maybeVote: Vote = { id: 'sAAA_c2', uid: 'u1', seatId: 'sAAA', cardId: 'c2', choice: 'maybe' };
assert(withVoteTallies(cards, [maybeVote]).find((c) => c.id === 'c2')?.maybeCount === 1, 'maybe votes land in the middle bucket');

const deck = ['c1', 'c2'];
assert(!seatCompletedDeck([adaA, adaB], 'sAAA', deck), 'one card is not a finished deck');
assert(seatCompletedDeck([adaA, adaACard2], 'sAAA', deck), 'a seat is done only after every card');
assert(!allSeatsCompletedDeck(['sAAA', 'sBBB'], [adaA, adaACard2, adaB], deck), 'end-voting waits for every seat on every card');
assert(allSeatsCompletedDeck(['sAAA', 'sBBB'], [adaA, adaB], ['c1']), 'a single-card deck can complete');
assert(!cardVotingComplete([adaA], ['sAAA', 'sBBB'], 'c1'), 'agreement labels wait until every seat voted on that card');
assert(cardVotingComplete([adaA, adaB], ['sAAA', 'sBBB'], 'c1'), 'a complete card can show an agreement label');
assert(seatsStartedCount(['sAAA', 'sBBB'], [adaA], deck) === 1, 'header counts a seat after its first vote');
assert(seatsFinishedCount(['sAAA', 'sBBB'], [adaA], deck) === 0, 'finished stays 0 until the deck is done');

assert(voteScreenForSeat({ leftover: 4, hasStarted: false, again: false }) === 'swipe', 'a new seat swipes leftover cards');
assert(voteScreenForSeat({ leftover: 0, hasStarted: true, again: false }) === 'summary', 'a finished seat sees early results');
assert(voteScreenForSeat({ leftover: 2, hasStarted: true, again: false }) === 'summary', 'new cards wait on early results until they swipe again');
assert(voteScreenForSeat({ leftover: 2, hasStarted: true, again: true }) === 'swipe', 'swipe again opens leftover cards');
assert(voteScreenForSeat({ leftover: 0, hasStarted: true, again: true }) === 'swipe', 'swipe again still opens the full deck');

console.log('voteTally tests ok');
