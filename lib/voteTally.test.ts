import { mergeVotes, withVoteTallies } from './voteTally';
import type { Card, Vote } from '@/types/room';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const a: Vote = { id: 's1_c1', uid: 'u1', seatId: 's1', cardId: 'c1', choice: 'agree' };
const b: Vote = { id: 's2_c1', uid: 'u1', seatId: 's2', cardId: 'c1', choice: 'disagree' };
const localChange: Vote = { id: 's1_c1', uid: 'u1', seatId: 's1', cardId: 'c1', choice: 'disagree' };

const merged = mergeVotes([a], [b, localChange]);
assert(merged.length === 2, 'two seats stay two votes');
assert(merged.find((v) => v.seatId === 's1')?.choice === 'disagree', 'optimistic choice wins until server catches up');

const cards: Card[] = [
  { id: 'c1', text: 'Goa', kind: 'synthesized', order: 0, agreeCount: 99, disagreeCount: 99 },
];
const tallied = withVoteTallies(cards, merged);
assert(tallied[0]?.agreeCount === 0 && tallied[0]?.disagreeCount === 2, 'UI tallies follow votes, not stale counters');

console.log('voteTally tests ok');
