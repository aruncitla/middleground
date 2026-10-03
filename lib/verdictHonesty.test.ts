import { canShowDiscussionScore, isEarlySignal } from './verdictHonesty';
import type { Vote } from '@/types/room';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const three: Vote[] = [
  { id: '1', uid: 'a', seatId: 's1', cardId: 'c1', choice: 'agree' },
  { id: '2', uid: 'b', seatId: 's2', cardId: 'c1', choice: 'agree' },
  { id: '3', uid: 'c', seatId: 's3', cardId: 'c1', choice: 'agree' },
];

assert(
  !canShowDiscussionScore(three, [{ agreeCount: 3, disagreeCount: 0, maybeCount: 0 }]),
  '3 votes on one thought do not show a discussion score',
);
assert(isEarlySignal(three), '3 votes is still an early signal');

console.log('verdictHonesty tests ok');
